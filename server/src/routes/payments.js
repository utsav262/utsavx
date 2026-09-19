import { Router } from 'express';
import { wrapControllers } from '../middleware/asyncHandler.js';
import * as paymentFns from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';

const { createIntent, completeDemo, legacyPaymentStatus, verifyRazorpay } = wrapControllers(paymentFns);
const router = Router();
router.get('/status/:intentId', requireAuth, legacyPaymentStatus);
router.post('/:orderId/intent', requireAuth, createIntent);
router.post('/:orderId/complete-demo', requireAuth, completeDemo);
router.post('/razorpay/verify', requireAuth, verifyRazorpay);
export default router;
