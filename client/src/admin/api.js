import axios from 'axios';
import { reportApiError } from '../lib/apiErrors.js';

/** Admin console API — own base path and own token; never sends the customer/organizer token. */
export const ADMIN_TOKEN_KEY = 'utsavx_admin_token';

const root = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
    : (import.meta.env.DEV ? '' : 'http://localhost:5050');

const adminApi = axios.create({ baseURL: `${root}/api/admin/v1` });

adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            window.dispatchEvent(new Event('utsavx-admin-logout'));
        }
        // A wrong password on the login form is shown inline there, not as a toast.
        if (error.config?.url === '/auth/login') return Promise.reject(error);
        return reportApiError(error);
    }
);

/** GET a list endpoint as CSV and save it. */
export async function downloadCsv(path, params, filename) {
    const res = await adminApi.get(path, { params: { ...params, format: 'csv', page: undefined, limit: undefined }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const admin = {
    get: (path, params) => adminApi.get(path, { params }),
    post: (path, body) => adminApi.post(path, body),
    patch: (path, body) => adminApi.patch(path, body),
    put: (path, body) => adminApi.put(path, body),
    del: (path) => adminApi.delete(path),
    login: (email, password) => adminApi.post('/auth/login', { email, password }),
    me: () => adminApi.get('/auth/me'),
    logout: () => adminApi.post('/auth/logout'),
    dashboard: (params) => adminApi.get('/dashboard', { params }),
    settlements: (params) => adminApi.get('/settlements', { params }),
    settlement: (id) => adminApi.get(`/settlements/${id}`),
    settlementReceipt: (id, receiptId) => adminApi.get(`/settlements/${id}/receipts/${receiptId}`, { responseType: 'blob' }),
    approveSettlement: (id, note) => adminApi.post(`/settlements/${id}/approve`, { note }),
    rejectSettlement: (id, note) => adminApi.post(`/settlements/${id}/reject`, { note })
};
