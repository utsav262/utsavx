import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, Save, RotateCw } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { unwrap, unwrapList } from '../../lib/unwrap.js';
import { useEventTaxonomy } from '../../lib/useEventTaxonomy.js';
import TicketFlow from '../tickets/TicketFlow.jsx';
import { isNonComplimentary, peopleCapacity, ticketFromApi } from '../tickets/ticketUtils.js';
import WizardProgress from './create/WizardProgress.jsx';
import LivePreview from './create/LivePreview.jsx';
import StepOrganizer from './create/StepOrganizer.jsx';
import StepBasics from './create/StepBasics.jsx';
import StepMedia from './create/StepMedia.jsx';
import StepAudience from './create/StepAudience.jsx';
import StepTickets from './create/StepTickets.jsx';
import StepCoupons from './create/StepCoupons.jsx';
import StepPeople from './create/StepPeople.jsx';
import StepSpecializedDetails from './create/StepSpecializedDetails.jsx';
import StepReview from './create/StepReview.jsx';
import {
  buildEventPayload,
  buildSteps,
  emptyForm,
  findOrganizer,
  formFromEvent,
  tracksFor,
  validateAll,
  validateStep,
  zonedLocalToIso,
} from './create/eventForm.js';

const LIVE = ['published', 'sold-out'];

/** Which wizard step owns a server-side validation error key. */
function stepForServerField(field) {
  const root = field.split('.')[0];
  if (['organizerType', 'organizationName', 'category', 'subcategory', 'eventFormat', 'visibility'].includes(root)) return 'organizer';
  if (['imageUrl', 'logoUrl'].includes(root)) return 'media';
  if (['audience', 'registration'].includes(root)) return 'audience';
  if (root === 'details') return 'details';
  return 'basics';
}

const apiMessage = (failure, fallback) => failure?.response?.data?.message || fallback;

export default function CreateEventFlow({ reload, notice, onCreated, onCancel, eventId: seedEventId }) {
  const user = useSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'admin';
  const { taxonomy, error: taxonomyError, retry: retryTaxonomy } = useEventTaxonomy();

  const [stepId, setStepId] = useState('organizer');
  const [visited, setVisited] = useState(() => new Set(['organizer']));
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);
  const [eventId, setEventId] = useState(seedEventId || null);
  const [savedStatus, setSavedStatus] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [tickets, setTickets] = useState([]);
  const [ticketFlowOpen, setTicketFlowOpen] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [guests, setGuests] = useState([]);
  const [team, setTeam] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [hydrating, setHydrating] = useState(Boolean(seedEventId));
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [errors, setErrors] = useState({});

  // Server ids of rows already saved, keyed by the row's client key — so saves only create what's new
  // and delete what was removed, instead of re-creating everything.
  const persisted = useRef({ gallery: new Map(), guests: new Map(), team: new Map(), coupons: new Map(), cover: [] });
  const keySeq = useRef(0);
  const newKey = useCallback(() => `row-${++keySeq.current}`, []);

  /* ---------- derived ---------- */
  const tracks = useMemo(() => tracksFor(taxonomy, form.organizerType, form.category), [taxonomy, form.organizerType, form.category]);
  const steps = useMemo(() => buildSteps(tracks), [tracks]);
  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const isEdit = Boolean(seedEventId);
  const isLive = LIVE.includes(savedStatus);
  // Mid-flow saves keep a submitted event in review instead of silently withdrawing it to draft.
  const isPending = savedStatus === 'review_pending';

  // People the sellable tiers admit (tickets × people per ticket); 0 = some tier is unlimited.
  const capacity = useMemo(() => {
    const sellable = tickets.filter(isNonComplimentary);
    if (sellable.some((t) => peopleCapacity(t) === null)) return 0;
    return sellable.reduce((s, t) => s + peopleCapacity(t), 0);
  }, [tickets]);

  // What the ticket editor validates each tier against (same zone + caps as the wizard).
  const ticketContext = useMemo(() => {
    const tz = form.timezone;
    const max = form.audience.maxCapacity;
    return {
      mode: form.registration.mode,
      timeZone: tz,
      eventEnd: zonedLocalToIso(form.endsAt, tz) || zonedLocalToIso(form.startsAt, tz),
      registrationOpens: zonedLocalToIso(form.registration.opensAt, tz),
      registrationCloses: zonedLocalToIso(form.registration.closesAt, tz),
      maxPeople: max === '' ? null : Number(max),
    };
  }, [form.timezone, form.audience.maxCapacity, form.registration, form.endsAt, form.startsAt]);
  const minPrice = useMemo(() => {
    const prices = tickets
      .filter(isNonComplimentary)
      .map((t) => Number(t.price))
      .filter((n) => !Number.isNaN(n));
    return prices.length ? Math.min(...prices) : 0;
  }, [tickets]);

  const ctx = useMemo(
    () => ({ form, taxonomy, tickets, isNew: !isEdit }),
    [form, taxonomy, tickets, isEdit]
  );
  const issues = useMemo(
    () => (taxonomy ? validateAll(steps.filter((s) => s.id !== 'review'), { ...ctx, final: true }) : []),
    [taxonomy, steps, ctx]
  );

  // If the Details step disappears (organizer/category changed), don't strand the user on it.
  useEffect(() => {
    if (!steps.some((s) => s.id === stepId)) setStepId('people');
  }, [steps, stepId]);

  /* ---------- hydrate (edit mode) ---------- */
  useEffect(() => {
    if (!seedEventId) return undefined;
    let cancelled = false;
    (async () => {
      setHydrating(true);
      setLoadError('');
      try {
        const [detail, ticketRows, imageRows, guestRows, handlerRows, couponRows] = await Promise.all([
          apiClient.managerEvent(seedEventId),
          apiClient.managerTickets(seedEventId),
          apiClient.managerImages(seedEventId),
          apiClient.managerGuests(seedEventId),
          apiClient.managerHandlers(seedEventId, 'all'),
          apiClient.managerCoupons(seedEventId),
        ]);
        if (cancelled) return;
        const event = unwrap(detail, null);
        if (!event) throw new Error('Event not found');
        const p = { gallery: new Map(), guests: new Map(), team: new Map(), coupons: new Map(), cover: [] };
        const keyed = (rows, map, toRow) =>
          rows.map((row) => {
            const key = newKey();
            map.set(key, row._id);
            return { key, _id: row._id, ...toRow(row) };
          });

        const images = unwrapList(imageRows);
        p.cover = images.filter((img) => img.type === 'cover').map((img) => ({ _id: img._id, url: img.url }));
        const hydrated = formFromEvent(event);
        if (!hydrated.imageUrl && p.cover[0]) hydrated.imageUrl = p.cover[0].url;

        setEventId(event._id || seedEventId);
        setSavedStatus(event.status);
        setForm(hydrated);
        const rows = unwrapList(ticketRows);
        const zone = { timeZone: hydrated.timezone };
        setTickets((rows.length ? rows : event.ticketTypes || []).map((row) => ticketFromApi(row, zone)));
        setGallery(keyed(images.filter((img) => img.type !== 'cover'), p.gallery, (img) => ({ url: img.url })));
        setGuests(keyed(unwrapList(guestRows), p.guests, (g) => ({ name: g.name, email: g.email || '' })));
        setTeam(keyed(unwrapList(handlerRows), p.team, (h) => ({
          email: h.email,
          type: h.userType || h.type,
          status: h.invitationStatus || h.status,
          allotments: h.allotments || [],
        })));
        setCoupons(keyed(unwrapList(couponRows), p.coupons, (c) => ({
          code: c.code,
          discount_type: c.discountType,
          discount_value: String(c.discountValue),
        })));
        persisted.current = p;
      } catch (failure) {
        if (!cancelled) setLoadError(apiMessage(failure, 'Could not load event for editing.'));
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seedEventId, newKey, loadAttempt]);

  /* ---------- navigation ---------- */
  const goTo = (id) => {
    setStepId(id);
    setVisited((v) => new Set(v).add(id));
    setErrors({});
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const canJumpTo = (index) => isEdit || index <= stepIndex || visited.has(steps[index]?.id);

  const handleNext = () => {
    const stepErrors = validateStep(stepId, ctx);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) {
      notice('Please fix the highlighted fields.');
      return;
    }
    goTo(steps[Math.min(stepIndex + 1, steps.length - 1)].id);
  };

  const handleBack = () => goTo(steps[Math.max(stepIndex - 1, 0)].id);

  /* ---------- saving ---------- */
  async function syncRelated(id) {
    const p = persisted.current;
    const failures = [];
    const attempt = async (label, fn) => {
      try {
        return (await fn()) || true;
      } catch (failure) {
        failures.push(`${label}: ${apiMessage(failure, 'failed')}`);
        return null;
      }
    };

    // Cover: one row matching form.imageUrl (the public page prefers it over event.imageUrl).
    const coverUrl = form.imageUrl.trim();
    const keep = p.cover.find((row) => row.url === coverUrl);
    for (const row of p.cover.filter((r) => r !== keep)) {
      if (await attempt('Old cover', () => apiClient.managerDeleteImage(row._id))) p.cover = p.cover.filter((r) => r !== row);
    }
    if (coverUrl && !keep) {
      const res = await attempt('Cover image', () => apiClient.managerCreateImage({ eventId: id, url: coverUrl, type: 'cover', sortOrder: 0 }));
      if (res?.data?.result?._id) p.cover.push({ _id: res.data.result._id, url: coverUrl });
    }

    const syncList = async ({ rows, setRows, map, create, remove, label }) => {
      const current = new Set(rows.map((row) => row.key));
      for (const [key, rowId] of [...map]) {
        if (!current.has(key) && (await attempt('Removing an item', () => remove(rowId)))) map.delete(key);
      }
      for (const row of rows) {
        if (map.has(row.key)) continue;
        const res = await attempt(label(row), () => create(row));
        const saved = res?.data?.result;
        if (!saved?._id) continue;
        map.set(row.key, saved._id);
        setRows((all) => all.map((r) => (r.key === row.key ? { ...r, _id: saved._id, status: saved.invitationStatus ?? r.status } : r)));
      }
    };

    await syncList({
      rows: gallery, setRows: setGallery, map: p.gallery,
      label: () => 'Gallery image',
      create: (row) => apiClient.managerCreateImage({ eventId: id, url: row.url, type: 'flyer', sortOrder: gallery.indexOf(row) + 1 }),
      remove: (rowId) => apiClient.managerDeleteImage(rowId),
    });
    await syncList({
      rows: guests, setRows: setGuests, map: p.guests,
      label: (row) => `Guest ${row.name}`,
      create: (row) => apiClient.managerCreateGuest({ eventId: id, name: row.name, email: row.email || undefined }),
      remove: (rowId) => apiClient.managerDeleteGuest(rowId),
    });
    await syncList({
      rows: team, setRows: setTeam, map: p.team,
      label: (row) => `Team invite for ${row.email}`,
      create: (row) => apiClient.managerAddHandler({
        eventId: id,
        email: row.email,
        type: row.type,
        scannerPermission: row.scannerPermission,
        tickets: row.allotments,
      }),
      remove: (rowId) => apiClient.managerDeleteHandler(rowId),
    });
    await syncList({
      rows: coupons, setRows: setCoupons, map: p.coupons,
      label: (row) => `Coupon ${row.code}`,
      create: (row) => apiClient.managerCreateCoupon({
        event_id: id,
        code: row.code,
        discount_type: row.discount_type,
        discount_value: Number(row.discount_value),
      }),
      remove: (rowId) => apiClient.managerDeleteCoupon(rowId),
    });
    return failures;
  }

  /**
   * Save the event (create or update) and sync its images, guests, team and coupons.
   * `stay` keeps the wizard open (mid-flow draft saves); otherwise hands off via onCreated.
   * Returns the saved event, or null when validation or the request failed.
   */
  async function save(status, { stay = false } = {}) {
    if (savingRef.current) return null;
    const draft = status === 'draft';

    if (draft) {
      const draftCtx = { ...ctx, draft: true };
      for (const id of ['organizer', 'basics', 'media', 'audience']) {
        const stepErrors = validateStep(id, draftCtx);
        if (Object.keys(stepErrors).length) {
          setStepId(id);
          setErrors(stepErrors);
          notice('A draft needs an organizer, category, title, description and start time.');
          return null;
        }
      }
    } else if (issues.length) {
      setStepId(issues[0].stepId);
      setErrors(validateStep(issues[0].stepId, { ...ctx, final: true }));
      notice(issues[0].message);
      return null;
    }

    savingRef.current = true;
    setBusy(true);
    try {
      const payload = buildEventPayload({ form, taxonomy, status, isAdmin });
      if (eventId) payload.id = eventId;
      const res = await apiClient.managerCreateEvent(payload);
      const event = res.data.result;
      setEventId(event._id);
      setSavedStatus(event.status);

      const failures = await syncRelated(event._id);
      await reload?.();
      if (failures.length) {
        notice(`"${event.title}" was saved, but some items failed — ${failures.join('; ')}`);
        return event;
      }
      const message = status === savedStatus && status !== 'draft'
        ? `"${event.title}" updated.`
        : event.status === 'review_pending'
          ? `"${event.title}" submitted for admin approval.`
          : LIVE.includes(event.status)
            ? `"${event.title}" is live.`
            : `"${event.title}" saved as draft.`;
      notice(message);
      if (!stay) onCreated?.(event);
      return event;
    } catch (failure) {
      const fieldErrors = failure.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const [firstField] = Object.keys(fieldErrors);
        const target = stepForServerField(firstField);
        setStepId(steps.some((s) => s.id === target) ? target : 'basics');
        setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k.split('.').pop(), v])));
      }
      notice(apiMessage(failure, 'Event could not be saved.'));
      return null;
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  const openTicketFlow = async () => {
    const id = eventId || (await save('draft', { stay: true }))?._id;
    if (!id) return;
    setBusy(true);
    try {
      const res = await apiClient.managerTickets(id);
      setTickets(unwrapList(res).map((row) => ticketFromApi(row, ticketContext)));
      setTicketFlowOpen(true);
    } catch (failure) {
      notice(apiMessage(failure, 'Could not open ticket editor.'));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => save(isLive ? savedStatus : isAdmin ? 'published' : 'review_pending');

  /* ---------- render ---------- */
  if (hydrating || (!taxonomy && !taxonomyError)) {
    return (
      <section className="mt-8 space-y-4" aria-busy="true">
        <div className="h-12 w-1/3 animate-pulse bg-ink/5" />
        <div className="h-64 animate-pulse bg-ink/5" />
      </section>
    );
  }

  if (taxonomyError || loadError) {
    return (
      <section className="mt-8 border border-red-200 bg-red-50 p-6">
        <p className="font-bold text-red-700">{loadError || taxonomyError}</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => (loadError ? setLoadAttempt((n) => n + 1) : retryTaxonomy())}
            className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-sm font-bold text-white"
          >
            <RotateCw size={14} /> Try again
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="border border-ink/20 px-4 py-2.5 text-sm font-bold">
              Back to events
            </button>
          )}
        </div>
      </section>
    );
  }

  if (ticketFlowOpen) {
    return (
      <section className="mt-8">
        <TicketFlow
          eventId={eventId}
          eventTitle={form.title || 'Event'}
          tickets={tickets}
          onTicketsChange={setTickets}
          notice={notice}
          onClose={() => setTicketFlowOpen(false)}
          context={ticketContext}
        />
      </section>
    );
  }

  // Once tickets exist, show the ticket rule live; before that, only after Continue was pressed.
  const ticketError = tickets.length ? errors.tickets || validateStep('tickets', ctx).tickets : errors.tickets;

  return (
    <section className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink"
            >
              <ArrowLeft size={13} /> All events
            </button>
          )}
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">
            {isEdit ? 'Edit event' : 'New event'}
          </p>
          <h2 className="serif mt-2 text-4xl leading-none sm:text-5xl">
            {isEdit ? 'Update the event.' : 'Build the event.'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isLive && stepId !== 'review' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => save(isPending ? 'review_pending' : 'draft', { stay: true })}
              className="inline-flex items-center gap-2 border border-ink/15 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-ink/70 hover:border-ink/30 disabled:opacity-50"
            >
              <Save size={13} /> {busy ? 'Saving…' : isPending ? 'Save changes' : 'Save draft'}
            </button>
          )}
          <div className="border border-ink/15 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-ink/55">
            Step {stepIndex + 1} / {steps.length}
          </div>
        </div>
      </div>

      <WizardProgress steps={steps} current={stepIndex} onJump={(i) => goTo(steps[i].id)} canJumpTo={canJumpTo} />

      {/* Body */}
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-6">
          {stepId === 'organizer' && <StepOrganizer form={form} setForm={setForm} taxonomy={taxonomy} errors={errors} />}
          {stepId === 'basics' && (
            <StepBasics
              form={form}
              setForm={setForm}
              errors={errors}
              isAdmin={isAdmin}
              showAcademicSession={tracks.includes('education')}
            />
          )}
          {stepId === 'media' && (
            <StepMedia
              form={form}
              setForm={setForm}
              gallery={gallery}
              setGallery={setGallery}
              errors={errors}
              newKey={newKey}
              logoLabel={findOrganizer(taxonomy, form.organizerType)?.orgLabel ? 'Logo & branding' : 'Event logo'}
            />
          )}
          {stepId === 'audience' && <StepAudience form={form} setForm={setForm} taxonomy={taxonomy} errors={errors} />}
          {stepId === 'tickets' && (
            <>
              <StepTickets
                tickets={tickets}
                capacity={capacity}
                minPrice={minPrice}
                onOpenFlow={openTicketFlow}
                busy={busy}
                mode={form.registration.mode}
                error={ticketError}
              />
              <StepCoupons coupons={coupons} setCoupons={setCoupons} notice={notice} newKey={newKey} />
            </>
          )}
          {stepId === 'people' && (
            <StepPeople
              owner={user}
              team={team}
              setTeam={setTeam}
              guests={guests}
              setGuests={setGuests}
              tickets={tickets}
              notice={notice}
              newKey={newKey}
            />
          )}
          {stepId === 'details' && (
            <StepSpecializedDetails form={form} setForm={setForm} taxonomy={taxonomy} tracks={tracks} />
          )}
          {stepId === 'review' && (
            <StepReview
              form={form}
              taxonomy={taxonomy}
              tracks={tracks}
              tickets={tickets}
              capacity={capacity}
              minPrice={minPrice}
              guests={guests}
              team={team}
              coupons={coupons}
              gallery={gallery}
              issues={issues}
              onFix={(index) => goTo(steps[index].id)}
              isAdmin={isAdmin}
              isLive={isLive}
              busy={busy}
              onSaveDraft={() => save('draft')}
              onSubmit={submit}
            />
          )}

          {/* Nav footer (hidden on review) */}
          {stepId !== 'review' && (
            <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
              <button
                type="button"
                disabled={stepIndex === 0 || busy}
                onClick={handleBack}
                className="inline-flex items-center gap-2 border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold hover:border-ink/30 disabled:opacity-30"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-60"
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>

        <LivePreview
          form={form}
          taxonomy={taxonomy}
          tickets={tickets}
          capacity={capacity}
          minPrice={minPrice}
          guests={guests}
          team={team}
          coupons={coupons}
        />
      </div>
    </section>
  );
}
