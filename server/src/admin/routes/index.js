import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { wrapControllers } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAdminAuth, allowRoles } from '../middleware/requireAdmin.js';
import { adminLoginSchema, dashboardQuerySchema, settlementListSchema, settlementReviewSchema } from '../validators/auth.js';
import * as authFns from '../controllers/authController.js';
import * as dashboardFns from '../controllers/dashboardController.js';
import * as settlementFns from '../controllers/settlementsController.js';
import * as usersFns from '../controllers/usersController.js';
import * as eventsFns from '../controllers/eventsController.js';
import * as ordersFns from '../controllers/ordersController.js';
import * as couponsFns from '../controllers/couponsController.js';
import * as notificationsFns from '../controllers/notificationsController.js';
import * as adminsFns from '../controllers/adminsController.js';
import * as auditFns from '../controllers/auditController.js';
import * as countriesFns from '../controllers/countriesController.js';
import * as siteSettingsFns from '../controllers/siteSettingsController.js';

const auth = wrapControllers(authFns);
const dashboard = wrapControllers(dashboardFns);
const settlements = wrapControllers(settlementFns);

/** Validate req.query into req.validatedQuery (422 on bad input). */
const validateQuery = (schema) => (req, res, next) => {
    try {
        req.validatedQuery = schema.parse(req.query);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(422).json({ message: 'Validation failed', errors: error.flatten().fieldErrors, code: 422 });
        }
        next(error);
    }
};

// 5 failed-or-not attempts per 15 min per IP + email.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}`,
    message: { message: 'Too many login attempts. Try again in 15 minutes.', code: 429 }
});

const router = Router();

router.post('/auth/login', loginLimiter, validate(adminLoginSchema), auth.login);

router.use(requireAdminAuth);
router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);

router.get('/dashboard', allowRoles('super_admin', 'admin', 'support'), validateQuery(dashboardQuerySchema), dashboard.overview);

// Settlements: everyone can view; only super_admin/admin can approve or reject.
const anyAdmin = allowRoles('super_admin', 'admin', 'support');
const reviewers = allowRoles('super_admin', 'admin');
router.get('/settlements', anyAdmin, validateQuery(settlementListSchema), settlements.list);
router.get('/settlements/:id', anyAdmin, settlements.detail);
router.get('/settlements/:id/receipts/:receiptId', anyAdmin, settlements.receipt);
router.post('/settlements/:id/approve', reviewers, validate(settlementReviewSchema), settlements.approve);
router.post('/settlements/:id/reject', reviewers, validate(settlementReviewSchema), settlements.reject);

/*
 * Role matrix
 *   support      read everything they can see + resend tickets
 *   admin        + moderate users/events, refunds, coupons, broadcasts, audit log
 *   super_admin  + change user roles, manage admin accounts
 */
const superOnly = allowRoles('super_admin');
const w = (fns) => wrapControllers(fns);
const users = w(usersFns);
const events = w(eventsFns);
const orders = w(ordersFns);
const coupons = w(couponsFns);
const notifications = w(notificationsFns);
const admins = w(adminsFns);
const auditLog = w(auditFns);
const countries = w(countriesFns);
const siteSettings = w(siteSettingsFns);

router.get('/users', anyAdmin, validateQuery(usersFns.usersQuery), users.list);
router.get('/users/:id', anyAdmin, users.detail);
router.patch('/users/:id', reviewers, users.update);

router.get('/events', anyAdmin, validateQuery(eventsFns.eventsQuery), events.list);
router.get('/catalog/categories', anyAdmin, events.categories);
router.post('/catalog/categories', reviewers, events.saveCategory);
router.patch('/catalog/categories/:id', reviewers, events.saveCategory);
router.get('/catalog/cities', anyAdmin, events.cities);
router.post('/catalog/cities', reviewers, events.saveCity);
router.patch('/catalog/cities/:id', reviewers, events.saveCity);
// Countries carry the platform fee settings, so only super admins change them.
router.get('/catalog/countries', anyAdmin, countries.list);
router.post('/catalog/countries', superOnly, countries.create);
router.patch('/catalog/countries/:id', superOnly, countries.update);
router.delete('/catalog/countries/:id', superOnly, countries.remove);
router.get('/settings/site', anyAdmin, siteSettings.get);
router.put('/settings/site', superOnly, siteSettings.update);
router.get('/events/:id', anyAdmin, events.detail);
router.post('/events/:id/moderate', reviewers, events.moderate);
router.post('/events/:id/feature', reviewers, events.feature);

router.get('/orders', anyAdmin, validateQuery(ordersFns.ordersQuery), orders.list);
router.get('/orders/:id', anyAdmin, orders.detail);
router.post('/orders/:id/refund', reviewers, orders.refund);
router.post('/orders/:id/resend', anyAdmin, orders.resend);

router.get('/coupons', anyAdmin, validateQuery(couponsFns.couponsQuery), coupons.list);
router.post('/coupons', reviewers, coupons.create);
router.patch('/coupons/:id', reviewers, coupons.update);
router.delete('/coupons/:id', reviewers, coupons.remove);

router.post('/notifications/preview', reviewers, notifications.preview);
router.post('/notifications/send', reviewers, notifications.send);
router.get('/notifications', reviewers, validateQuery(notificationsFns.historyQuery), notifications.history);

router.get('/admins', superOnly, validateQuery(adminsFns.adminsQuery), admins.list);
router.post('/admins', superOnly, admins.create);
router.patch('/admins/:id', superOnly, admins.update);

router.get('/audit', reviewers, validateQuery(auditFns.auditQuery), auditLog.list);

export default router;
