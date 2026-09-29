import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { admin as api, ADMIN_TOKEN_KEY } from './api.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)));

    useEffect(() => {
        if (!localStorage.getItem(ADMIN_TOKEN_KEY)) return;
        api.me()
            .then((res) => setAdmin(res.data.admin))
            .catch(() => setAdmin(null))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const onLogout = () => setAdmin(null);
        window.addEventListener('utsavx-admin-logout', onLogout);
        return () => window.removeEventListener('utsavx-admin-logout', onLogout);
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await api.login(email, password);
        localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token);
        setAdmin(res.data.admin);
        return res.data.admin;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.logout();
        } catch {
            /* session may already be gone */
        }
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdmin(null);
    }, []);

    return (
        <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export const useAdminAuth = () => useContext(AdminAuthContext);

/** Menu entries carry the roles that may see them. */
export const canSee = (admin, roles) => Boolean(admin && (!roles || roles.includes(admin.role)));
