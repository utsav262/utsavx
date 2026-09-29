import { Route, Routes } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';

export default function App() {
    return (
        <ToastProvider>
            <Routes>
                {/* Staff admin console: own login, token and layout (no site header/footer). */}
                <Route path="/admin/*" element={<AdminApp />} />
                <Route path="/*" element={<AppRoutes />} />
            </Routes>
        </ToastProvider>
    );
}
