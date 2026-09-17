import { Router } from 'express';
import { wrapControllers } from '../middleware/asyncHandler.js';
import * as orderFns from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderSchema } from '../validators/order.js';

const { createOrder, legacyMyTickets, myOrders, myTickets, ticketLookup } = wrapControllers(orderFns);
const router = Router();
router.get('/lookup/:confirmationId', ticketLookup);
router.get('/ticket-lookup/:confirmationId', ticketLookup);
router.use(requireAuth);
router.post('/', validate(orderSchema), createOrder);
router.get('/', myOrders);
router.get('/tickets', myTickets);
router.get('/my-tickets', legacyMyTickets);
export default router;
