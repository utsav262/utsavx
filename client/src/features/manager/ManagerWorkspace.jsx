import { useEffect, useState } from 'react';
import { PageHeader, PageShell } from '../../components/ui/Page.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiClient } from '../../api/index.js';
import { unwrap, unwrapList as list } from '../../lib/unwrap.js';
import Notice from './components/Notice.jsx';
import ManagerHome from './views/ManagerHome.jsx';
import SalesView from './views/SalesView.jsx';
import CouponsView from './views/CouponsView.jsx';
import PeopleView from './views/PeopleView.jsx';
import GateView from './views/GateView.jsx';
import CreateEventFlow from './CreateEventFlow.jsx';
import EventDashboard from './EventDashboard.jsx';
import AdminHome from '../admin/AdminHome.jsx';
import TicketFlow from '../tickets/TicketFlow.jsx';
import { ticketFromApi } from '../tickets/ticketUtils.js';

export default function ManagerWorkspace() {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [view, setView] = useState(location.state?.view === 'create' ? 'create' : 'home');
  const [editEventId, setEditEventId] = useState(location.state?.eventId || null);
  const [dashboard, setDashboard] = useState(null);
  const [events, setEvents] = useState([]);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [data, setData] = useState({
    orders: null, overview: null, checkIns: null, payouts: null,
    tickets: [], coupons: [], guests: [], handlers: [],
  });
  const [notice, setNotice] = useState({ message: '', tone: 'info' });

  const showNotice = (message, tone = 'info') => setNotice({ message, tone });

  const load = async () => {
    try {
      const requests = [apiClient.managerDashboard(), apiClient.managerEvents()];
      if (isAdmin) {
        requests.push(
          apiClient.managerPendingEvents(),
          apiClient.adminOverview(),
          apiClient.adminUsers()
        );
      }
      const [dash, eventResponse, pendingResponse, overviewResponse, usersResponse] = await Promise.all(requests);
      setDashboard(dash.data.result);
      setEvents(list(eventResponse));
      if (isAdmin) {
        setPending(list(pendingResponse));
        setAdminOverview(unwrap(overviewResponse, null));
        setUsers(list(usersResponse));
      }
    } catch (error) {
      showNotice(error.response?.data?.message || 'Unable to load manager data.', 'error');
    }
  };

  useEffect(() => { load(); }, [isAdmin]);

  useEffect(() => {
    if (location.state?.view === 'create') {
      setView('create');
      setEditEventId(location.state?.eventId || null);
    } else if (location.state?.view === 'home') {
      setView('home');
      setEditEventId(null);
    }
  }, [location.state]);

  const reviewEvent = async (id, action) => {
    try {
      if (action === 'approve') await apiClient.managerApproveEvent(id);
      else await apiClient.managerRejectEvent(id);
      showNotice(action === 'approve' ? 'Event approved and published.' : 'Event rejected.', 'success');
      await load();
    } catch (e) {
      showNotice(e.response?.data?.message || 'Review action failed.', 'error');
    }
  };

  const setEventStatus = async (id, status) => {
    try {
      await apiClient.adminSetEventStatus(id, status);
      showNotice(`Event status set to ${status}.`, 'success');
      await load();
    } catch (e) {
      showNotice(e.response?.data?.message || 'Could not update event status.', 'error');
    }
  };

  const toggleFeatured = async (id, featured) => {
    try {
      await apiClient.adminSetEventFeatured(id, featured);
      showNotice(featured ? 'Event featured.' : 'Removed from featured.', 'success');
      await load();
    } catch (e) {
      showNotice(e.response?.data?.message || 'Could not update featured.', 'error');
    }
  };

  const setUserRole = async (id, role) => {
    try {
      await apiClient.adminUpdateUserRole(id, role);
      showNotice(`User role updated to ${role}.`, 'success');
      await load();
    } catch (e) {
      showNotice(e.response?.data?.message || 'Could not update role.', 'error');
    }
  };

  const setUserPassword = async (id, password) => {
    try {
      await apiClient.adminUpdateUserPassword(id, password);
      showNotice('User password updated.', 'success');
      await load();
    } catch (e) {
      showNotice(e.response?.data?.message || 'Could not update password.', 'error');
      throw e;
    }
  };

  const openEventDashboard = async (event) => {
    if (!event?._id) return;
    setEventLoading(true);
    setSelected(event);
    setView('event');
    setNotice({ message: '', tone: 'info' });
    try {
      const [detail, orders, overview, checkIns, payouts, tickets, coupons, guests, handlers] =
        await Promise.all([
          apiClient.managerEvent(event._id),
          apiClient.managerOrders(event._id, { type: 'transactions', length: 20 }),
          apiClient.managerSalesOverview(event._id),
          apiClient.managerCheckIns(event._id),
          apiClient.managerPayouts(event._id),
          apiClient.managerTickets(event._id),
          apiClient.managerCoupons(event._id),
          apiClient.managerGuests(event._id),
          apiClient.managerHandlers(event._id),
        ]);

      const fullEvent = unwrap(detail, event);
      setSelected(fullEvent && !Array.isArray(fullEvent) ? fullEvent : event);
      setData({
        orders: unwrap(orders, null),
        overview: unwrap(overview, null),
        checkIns: unwrap(checkIns, null),
        payouts: unwrap(payouts, null),
        tickets: list(tickets),
        coupons: list(coupons),
        guests: list(guests),
        handlers: list(handlers),
      });
    } catch (e) {
      showNotice(e.response?.data?.message || 'Unable to load event dashboard.', 'error');
    } finally {
      setEventLoading(false);
    }
  };

  const reloadSelected = async () => {
    if (selected) await openEventDashboard(selected);
  };

  const goHome = () => { setView('home'); setNotice({ message: '', tone: 'info' }); };

  return (
    <PageShell>
      {view === 'home' && !isAdmin && (
        <PageHeader
          eyebrow="Host tools"
          title="Workspace"
          description="Your sales at a glance, quick actions and your most recent events."
        />
      )}

      <Notice message={notice.message} tone={notice.tone} onDismiss={() => setNotice({ message: '', tone: 'info' })} />

      {view === 'home' && (
        isAdmin ? (
          <AdminHome
            overview={adminOverview}
            events={events}
            pending={pending}
            users={users}
            selected={selected}
            onOpen={openEventDashboard}
            onApprove={(id) => reviewEvent(id, 'approve')}
            onReject={(id) => reviewEvent(id, 'reject')}
            onSetStatus={setEventStatus}
            onToggleFeatured={toggleFeatured}
            onSetRole={setUserRole}
            onSetPassword={setUserPassword}
          />
        ) : (
          <ManagerHome
            dashboard={dashboard}
            events={events}
            onCreate={() => { setEditEventId(null); setView('create'); }}
            onOpenDashboard={() => navigate('/dashboard')}
            onOpenEvent={openEventDashboard}
          />
        )
      )}

      {view === 'create' && (
        <CreateEventFlow
          key={editEventId || 'new'}
          eventId={editEventId}
          reload={load}
          notice={showNotice}
          onCancel={() => {
            setView('home');
            setEditEventId(null);
            navigate('/dashboard', { replace: true });
          }}
          onCreated={async (event) => {
            await load();
            setEditEventId(null);
            navigate(`/dashboard/events/${event._id || event.id}`, {
              state: {
                eventId: event._id || event.id,
                eventItem: { ...event, is_owner: true, event_handler_type: 'Owner' },
                name: event.title,
              },
            });
          }}
        />
      )}

      {view === 'event' && (
        <EventDashboard
          event={selected}
          data={data}
          loading={eventLoading}
          onBack={goHome}
          onGo={setView}
          canAddManagers
          onEdit={() => { setEditEventId(selected._id); setView('create'); }}
          onAddMember={(type) => {
            navigate(`/dashboard/events/${selected._id}/team/add`, {
              state: {
                type,
                eventId: selected._id,
                eventTitle: selected.title || selected.name || 'Event',
                ticketTypes: data.tickets?.length ? data.tickets : selected.ticketTypes || [],
              },
            });
          }}
        />
      )}

      {view === 'sales' && <SubView onBack={() => setView('event')}><SalesView event={selected} orders={data.orders} /></SubView>}
      {view === 'coupons' && <SubView onBack={() => setView('event')}><CouponsView event={selected} rows={data.coupons} reload={reloadSelected} notice={showNotice} /></SubView>}
      {view === 'people' && <SubView onBack={() => setView('event')}><PeopleView event={selected} data={data} reload={reloadSelected} notice={showNotice} /></SubView>}
      {view === 'gate' && <SubView onBack={() => setView('event')}><GateView event={selected} notice={showNotice} /></SubView>}
      {view === 'tickets' && selected && (
        <SubView onBack={() => setView('event')}>
          <TicketFlow
            eventId={selected._id}
            eventTitle={selected.title || 'Event'}
            tickets={(data.tickets || []).map(ticketFromApi)}
            onTicketsChange={async (rows) => {
              if (Array.isArray(rows)) setData((prev) => ({ ...prev, tickets: rows }));
              await reloadSelected();
            }}
            notice={showNotice}
            onClose={() => setView('event')}
          />
        </SubView>
      )}
    </PageShell>
  );
}

function SubView({ onBack, children }) {
  return (
    <div className="mt-2">
      <button
        onClick={onBack}
        className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink"
      >
        ← Back to event dashboard
      </button>
      {children}
    </div>
  );
}
