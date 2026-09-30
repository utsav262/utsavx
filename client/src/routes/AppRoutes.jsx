import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser, signOut } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import ManagerShell, { useInManagerShell } from '../components/layout/ManagerShell.jsx';
import RequireAuth from '../components/auth/RequireAuth.jsx';
import RequireRole from '../components/auth/RequireRole.jsx';
import RequireGuest from '../components/auth/RequireGuest.jsx';
import RequireBuyer from '../components/auth/RequireBuyer.jsx';

import Home from '../pages/Home.jsx';
import Events from '../pages/Events.jsx';
import EventDetail from '../pages/EventDetail.jsx';
import Cart from '../pages/Cart.jsx';
import Checkout from '../pages/Checkout.jsx';
import Login from '../pages/Login.jsx';
import Tickets from '../pages/Tickets.jsx';
import Organizer from '../pages/Organizer.jsx';
import ManagerSignIn from '../pages/ManagerSignIn.jsx';
import ManagerSignUp from '../pages/ManagerSignUp.jsx';
import ManagerWorkspace from '../features/manager/ManagerWorkspace.jsx';
import Invitations from '../pages/Invitations.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import EventDashboard from '../pages/EventDashboard.jsx';
import AddTeamMember from '../features/team/AddTeamMember.jsx';
import TeamMemberPage from '../features/team/TeamMemberPage.jsx';
import Notifications from '../pages/Notifications.jsx';
import Settlements from '../pages/Settlements.jsx';
import Profile from '../pages/Profile.jsx';
import Sell from '../pages/Sell.jsx';

import About from '../pages/About.jsx';
import Careers from '../pages/Careers.jsx';
import Blog from '../pages/Blog.jsx';
import Press from '../pages/Press.jsx';
import Pricing from '../pages/Pricing.jsx';
import HowItWorks from '../pages/HowItWorks.jsx';
import TicketOutlets from '../pages/TicketOutlets.jsx';
import PhysicalTickets from '../pages/PhysicalTickets.jsx';
import Help from '../pages/Help.jsx';
import Contact from '../pages/Contact.jsx';
import Refunds from '../pages/Refunds.jsx';
import Faq from '../pages/Faq.jsx';
import Terms from '../pages/Terms.jsx';
import Privacy from '../pages/Privacy.jsx';
import Cookies from '../pages/Cookies.jsx';
import Sitemap from '../pages/Sitemap.jsx';
import NotFound from '../pages/NotFound.jsx';
import Unauthorized from '../pages/Unauthorized.jsx';

export default function AppRoutes() {
  const dispatch = useDispatch();
  const inShell = useInManagerShell();

  useEffect(() => {
    if (!localStorage.getItem('utsavx_token')) return;
    apiClient.me()
      .then((response) => {
        const profile = unwrap(response, null);
        if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
          dispatch(signOut());
          return;
        }
        dispatch(setUser({
          user: profile,
          token: localStorage.getItem('utsavx_token'),
        }));
      })
      // Only a rejected token logs you out; network errors / rate limits keep the session.
      .catch((error) => {
        if (error.response?.status === 401) dispatch(signOut());
      });
  }, [dispatch]);

  const routes = (
      <Routes>
        {/* ---------- PUBLIC ---------- */}
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/cart" element={<RequireBuyer><Cart /></RequireBuyer>} />
        <Route path="/checkout" element={<RequireBuyer><Checkout /></RequireBuyer>} />
        
        {/* ---------- INFORMATIONAL & FOOTER PAGES ---------- */}
        <Route path="/about" element={<About />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<Blog />} />
        <Route path="/press" element={<Press />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/ticket-outlets" element={<TicketOutlets />} />
        <Route path="/physical-tickets" element={<PhysicalTickets />} />
        <Route path="/help" element={<Help />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/sitemap" element={<Sitemap />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ---------- GUEST ONLY (login/signup) ---------- */}
        <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
        <Route path="/organizer" element={<RequireGuest><Organizer /></RequireGuest>} />
        <Route path="/manager/login" element={<RequireGuest><ManagerSignIn /></RequireGuest>} />
        <Route path="/manager/signin" element={<RequireGuest><ManagerSignIn /></RequireGuest>} />
        <Route path="/manager/signup" element={<RequireGuest><ManagerSignUp /></RequireGuest>} />

        {/* ---------- USER (any logged in) ---------- */}
        <Route path="/tickets" element={<RequireAuth><Tickets /></RequireAuth>} />
        <Route path="/invitations" element={<RequireAuth><Invitations /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/dashboard/events/:eventId" element={<RequireAuth><EventDashboard /></RequireAuth>} />
        <Route path="/dashboard/events/:eventId/team/add" element={<RequireAuth><AddTeamMember /></RequireAuth>} />
        <Route path="/dashboard/events/:eventId/team/:handlerId" element={<RequireAuth><TeamMemberPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/dashboard/settlements" element={<RequireRole roles={['organizer']}><Settlements /></RequireRole>} />
        <Route path="/dashboard/sell/:eventId" element={<RequireAuth><Sell /></RequireAuth>} />

        {/* ---------- MANAGER ONLY ---------- */}
        <Route path="/manager" element={<RequireRole roles={['manager', 'organizer']}><ManagerWorkspace /></RequireRole>} />

        {/* ---------- ADMIN ONLY ---------- */}
        <Route path="/admin-legacy" element={<RequireRole roles={['admin']}><ManagerWorkspace /></RequireRole>} />

        {/* ---------- FALLBACK ---------- */}
        <Route path="*" element={<NotFound />} />
      </Routes>
  );

  if (inShell) return <ManagerShell>{routes}</ManagerShell>;

  return (
    <>
      <Header />
      {routes}
      <Footer />
    </>
  );
}
