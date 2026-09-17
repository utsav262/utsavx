import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api/v1' : 'http://localhost:5050/api/v1')
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('utsavx_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && error.config?.headers?.Authorization) {
            localStorage.removeItem('utsavx_token');
            localStorage.removeItem('utsavx_user');
        }
        return Promise.reject(error);
    }
);

export default api;
