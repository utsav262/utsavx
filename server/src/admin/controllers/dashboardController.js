import { dashboardStats } from '../services/dashboardStats.js';

export async function overview(req, res) {
    try {
        const { from, to, refresh } = req.validatedQuery;
        const stats = await dashboardStats({ from, to }, { refresh: refresh === '1' });
        return res.json({ message: 'Dashboard fetched successfully', code: 200, result: stats });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || 'Could not load dashboard', code: error.statusCode || 500 });
    }
}
