import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, signOut } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import RequireAuth from '../components/auth/RequireAuth.jsx';
import RequireManager from '../components/auth/RequireManager.jsx';
import RequireAdmin from '../components/auth/RequireAdmin.jsx';
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
import AdminSignIn from '../pages/AdminSignIn.jsx';
import ManagerWorkspace from '../features/manager/ManagerWorkspace.jsx';

export default function AppRoutes() {
    const user = useSelector((state) => state.auth.user);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!localStorage.getItem('utsavx_token')) return;
        apiClient.me()
            .then((response) => dispatch(setUser({
                user: unwrap(response, user),
                token: localStorage.getItem('utsavx_token')
            })))
            .catch(() => dispatch(signOut()));
    }, [dispatch]);

    return (
        <>
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/organizer" element={<Organizer />} />
                <Route path="/manager/login" element={<ManagerSignIn />} />
                <Route path="/manager/signin" element={<ManagerSignIn />} />
                <Route path="/manager/signup" element={<ManagerSignUp />} />
                <Route path="/admin/login" element={<AdminSignIn />} />
                <Route path="/admin/signin" element={<AdminSignIn />} />
                <Route path="/tickets" element={<RequireAuth><Tickets /></RequireAuth>} />
                <Route path="/manager" element={<RequireManager><ManagerWorkspace /></RequireManager>} />
                <Route path="/admin" element={<RequireAdmin><ManagerWorkspace /></RequireAdmin>} />
                <Route path="*" element={<Home />} />
            </Routes>
            <Footer />
        </>
    );
}
