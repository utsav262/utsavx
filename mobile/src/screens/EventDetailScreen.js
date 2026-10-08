import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  Share2,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react-native';
import { api } from '../api';
import { absoluteUrl, listOf } from '../api/client';
import { useCart } from '../context/CartContext';
import { EventRow } from '../components/EventCards';
import EventImage from '../components/EventImage';
import { Scrim } from '../components/Gradient';
import ScrollHeader, { useScrollFade } from '../components/ScrollHeader';
import {
  Button,
  EmptyState,
  IconButton,
  Loader,
  QtyStepper,
  SectionHeader,
  StatusPill,
} from '../components/ui';
import { MAX_TICKETS_PER_TYPE } from '../config';
import { colors, radius, text } from '../theme';
import { formatDate, formatDateTime, formatTime, money } from '../lib/format';
import {
  eventAvailability,
  eventCity,
  eventImage,
  eventKey,
  eventMongoId,
  eventTitle,
  ticketLeft,
  ticketState,
  ticketTypeId,
  ticketTypesOf,
  venueLine,
} from '../lib/events';

const AVAILABILITY = {
  live: { label: 'Booking open', tone: 'green' },
  ended: { label: 'Ended', tone: 'grey' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  'sold-out': { label: 'Sold out', tone: 'amber' },
  unavailable: { label: 'Not on sale', tone: 'grey' },
};

export default function EventDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const cart = useCart();

  const [event, setEvent] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | not_found | error
  const [selectedId, setSelectedId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setRelated([]);
    (async () => {
      try {
        const res = await api.event(id);
        const result = res?.result || res?.event;
        if (!alive) return;
        if (!result || Array.isArray(result)) {
          setStatus('not_found');
          return;
        }
        const types = ticketTypesOf(result);
        const first = types.find(t => ticketState(t) === 'on-sale') || types[0];
        setEvent(result);
        setSelectedId(first ? ticketTypeId(first) : null);
        setQuantity(1);
        setStatus('ready');
        api
          .relatedEvents(eventMongoId(result))
          .then(r => alive && setRelated(listOf(r)))
          .catch(() => {});
      } catch (e) {
        if (alive) setStatus(e.status === 404 ? 'not_found' : 'error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const tickets = ticketTypesOf(event);
  const selected = useMemo(
    () => tickets.find(t => ticketTypeId(t) === selectedId) || null,
    [tickets, selectedId],
  );
  const heroHeight = 340 + insets.top;
  const { onScroll, opacity: headerOpacity } = useScrollFade(
    heroHeight - 150,
    heroHeight - 80,
  );

  if (status === 'loading') return <Loader style={styles.screen} />;
  if (status !== 'ready') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <EmptyState
          icon={Ticket}
          title={
            status === 'not_found' ? 'Event not found' : 'Something went wrong'
          }
          message={
            status === 'not_found'
              ? "This event doesn't exist or has been removed."
              : 'We could not load this event. Check your connection.'
          }
          action={
            status === 'not_found' ? (
              <Button title="Go back" onPress={() => navigation.goBack()} />
            ) : (
              <Button
                title="Try again"
                onPress={() => setAttempt(n => n + 1)}
              />
            )
          }
        />
      </View>
    );
  }

  const title = eventTitle(event);
  const availability = eventAvailability(event);
  const selectedState = ticketState(selected);
  const left = ticketLeft(selected);
  const maxQty = Math.max(
    1,
    Math.min(MAX_TICKETS_PER_TYPE, left ?? MAX_TICKETS_PER_TYPE),
  );
  const canBuy =
    availability === 'live' && Boolean(selected) && selectedState === 'on-sale';
  const price = Number(selected?.price ?? event.price ?? 0);
  const venue = venueLine(event.venue);
  const badge = AVAILABILITY[availability];

  const share = () => {
    const when = formatDateTime(event.startsAt);
    Share.share({
      message: `${title}${when ? ` — ${when}` : ''}${
        venue ? ` at ${venue}` : ''
      }. Book on UtsavX.`,
    }).catch(() => {});
  };

  const addToCart = () => {
    if (!canBuy) return;
    cart.add({
      id: `${eventMongoId(event)}-${ticketTypeId(selected)}`,
      eventId: eventMongoId(event),
      ticketTypeId: ticketTypeId(selected),
      title,
      ticketName: selected.name || 'General Admission',
      price,
      quantity,
      maxQty,
      startsAt: event.startsAt,
      city: eventCity(event),
      category: event.category,
      image: eventImage(event),
      slug: eventKey(event),
    });
    navigation.navigate('Tabs', { screen: 'Cart' });
  };

  let ctaLabel = 'Add to cart';
  if (availability !== 'live') ctaLabel = badge.label;
  else if (!canBuy)
    ctaLabel = selectedState === 'paused' ? 'Sales paused' : 'Sold out';

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Cover */}
        <EventImage
          uri={eventImage(event)}
          seed={title}
          category={event.category}
          iconSize={64}
          style={{ height: heroHeight }}
        >
          <Scrim from={0.35} to={0.1} />
        </EventImage>

        {/* Sheet */}
        <View style={styles.sheet}>
          <View style={styles.pills}>
            {event.category ? (
              <StatusPill label={event.category} tone="soft" />
            ) : null}
            <StatusPill label={badge.label} tone={badge.tone} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {event.host?.name ? (
            <Text style={styles.host}>
              by <Text style={styles.hostName}>{event.host.name}</Text>
            </Text>
          ) : null}

          <View style={styles.facts}>
            <Fact
              icon={CalendarDays}
              title={formatDate(event.startsAt) || 'Date TBA'}
              subtitle={formatTime(event.startsAt)}
            />
            <Fact
              icon={MapPin}
              title={event.venue?.name || eventCity(event) || 'Venue TBA'}
              subtitle={venue}
            />
          </View>

          {/* Tickets */}
          <SectionHeader title="Choose tickets" style={styles.section} />
          {tickets.length ? (
            tickets.map(ticket => {
              const state = ticketState(ticket);
              const remaining = ticketLeft(ticket);
              const active = ticketTypeId(ticket) === selectedId;
              const unavailable = state !== 'on-sale';
              let meta = 'Available';
              if (state === 'sold-out') meta = 'Sold out';
              else if (state === 'paused') meta = 'Sales paused';
              else if (remaining !== null) meta = `Only ${remaining} left`;
              return (
                <Pressable
                  key={ticketTypeId(ticket)}
                  onPress={() => {
                    setSelectedId(ticketTypeId(ticket));
                    setQuantity(1);
                  }}
                  disabled={unavailable}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: active,
                    disabled: unavailable,
                  }}
                  style={[
                    styles.ticket,
                    active && styles.ticketActive,
                    unavailable && styles.ticketOff,
                  ]}
                >
                  <View style={[styles.check, active && styles.checkActive]}>
                    {active ? <Check size={14} color={colors.white} /> : null}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <Text
                      style={[
                        styles.ticketMeta,
                        remaining !== null &&
                          remaining <= 20 &&
                          styles.ticketLow,
                      ]}
                    >
                      {meta}
                    </Text>
                  </View>
                  <Text style={styles.ticketPrice}>
                    {Number(ticket.price) > 0
                      ? money(ticket.price, ticket.currency)
                      : 'Free'}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={text.body}>Tickets are not on sale yet.</Text>
          )}

          {canBuy ? (
            <View style={styles.qtyRow}>
              <View>
                <Text style={styles.qtyLabel}>Quantity</Text>
                <Text style={styles.qtyHint}>Max {maxQty} per order</Text>
              </View>
              <QtyStepper
                value={quantity}
                max={maxQty}
                onChange={setQuantity}
              />
            </View>
          ) : null}

          {/* About */}
          <SectionHeader title="About" style={styles.section} />
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : 4}
          >
            {event.description || 'No description provided.'}
          </Text>
          {(event.description || '').length > 180 ? (
            <Pressable onPress={() => setExpanded(value => !value)} hitSlop={8}>
              <Text style={styles.readMore}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
            </Pressable>
          ) : null}

          {/* Gallery */}
          {event.flyer1 || event.flyer2 ? (
            <View style={styles.gallery}>
              {[event.flyer1, event.flyer2].filter(Boolean).map(url => (
                <EventImage
                  key={url}
                  uri={absoluteUrl(url)}
                  seed={title}
                  category={event.category}
                  style={styles.flyer}
                />
              ))}
            </View>
          ) : null}

          {/* Lineup */}
          {event.guests?.length ? (
            <>
              <SectionHeader title="Lineup" style={styles.section} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.guests}
              >
                {event.guests.map(guest => (
                  <View key={guest._id || guest.name} style={styles.guest}>
                    <View style={styles.guestAvatar}>
                      <Text style={styles.guestInitial}>
                        {(guest.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.guestName} numberOfLines={1}>
                      {guest.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Good to know */}
          <View style={styles.good}>
            <GoodRow
              icon={ShieldCheck}
              label="Entry with a valid ID and ticket"
            />
            <GoodRow
              icon={Users}
              label={
                left !== null
                  ? `${left} tickets left for ${selected?.name}`
                  : 'Limited tickets'
              }
            />
            <GoodRow icon={Clock} label="Gates open 1 hour before start" />
          </View>

          {/* Related */}
          {related.length ? (
            <>
              <SectionHeader
                title="You might also like"
                style={styles.section}
              />
              <FlatList
                scrollEnabled={false}
                data={related.slice(0, 4)}
                keyExtractor={item => String(eventKey(item))}
                renderItem={({ item }) => (
                  <EventRow event={item} style={styles.related} />
                )}
              />
            </>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* Solid header with the title once the cover scrolls away */}
      <ScrollHeader opacity={headerOpacity} title={title} barHeight={60} />

      {/* Floating buttons */}
      <View
        style={[styles.topButtons, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <IconButton
          icon={ChevronLeft}
          label="Back"
          variant="glass"
          onPress={() => navigation.goBack()}
        />
        <IconButton
          icon={Share2}
          label="Share"
          variant="glass"
          onPress={share}
        />
      </View>

      {/* Book bar */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.flex}>
          <Text style={text.caption}>
            {canBuy ? `${quantity} × ${money(price)}` : 'Price'}
          </Text>
          <Text style={styles.total}>
            {canBuy
              ? money(price * quantity)
              : price > 0
              ? money(price)
              : 'Free'}
          </Text>
        </View>
        <Button
          title={ctaLabel}
          onPress={addToCart}
          disabled={!canBuy}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

function Fact({ icon: Icon, title, subtitle }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.factTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.factSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function GoodRow({ icon: Icon, label }) {
  return (
    <View style={styles.goodRow}>
      <Icon size={16} color={colors.primary} />
      <Text style={styles.goodText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: 'center', padding: 20 },
  flex: { flex: 1 },
  sheet: {
    marginTop: -32,
    paddingHorizontal: 20,
    paddingTop: 22,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bg,
  },
  pills: { flexDirection: 'row', gap: 8 },
  title: { ...text.h1, marginTop: 12 },
  host: { ...text.small, marginTop: 4 },
  hostName: { color: colors.text, fontWeight: '700' },
  facts: { gap: 12, marginTop: 20 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  factTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  factSubtitle: { ...text.small, marginTop: 2 },
  section: { marginTop: 28 },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ticketActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  ticketOff: { opacity: 0.45 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ticketName: { fontSize: 15, fontWeight: '700', color: colors.text },
  ticketMeta: { ...text.caption, marginTop: 3 },
  ticketLow: { color: colors.orange },
  ticketPrice: { fontSize: 17, fontWeight: '800', color: colors.text },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  qtyLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  qtyHint: { ...text.caption, marginTop: 2 },
  description: { ...text.body, lineHeight: 23 },
  readMore: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  gallery: { flexDirection: 'row', gap: 12, marginTop: 16 },
  flyer: { flex: 1, aspectRatio: 4 / 3, borderRadius: radius.md },
  guests: { gap: 16 },
  guest: { width: 72, alignItems: 'center' },
  guestAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  guestInitial: { fontSize: 20, fontWeight: '800', color: colors.text },
  guestName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  good: {
    gap: 12,
    marginTop: 24,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goodText: { flex: 1, ...text.small },
  related: { marginBottom: 12 },
  topButtons: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  total: { fontSize: 22, fontWeight: '800', color: colors.text },
  cta: { minWidth: 170 },
});
