import AppRoutes from './routes/AppRoutes.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';

export default function App() {
    return (
        <ToastProvider>
            <AppRoutes />
        </ToastProvider>
    );
}
