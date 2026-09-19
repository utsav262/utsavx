import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { wrapControllers } from '../middleware/asyncHandler.js';
import * as invitationFns from '../controllers/invitationController.js';

const invitations = wrapControllers(invitationFns);
const router = Router();

router.use(requireAuth);
router.get('/', invitations.listInvitations);
router.get('/catalog', invitations.staffCatalog);
router.get('/events/:eventId', invitations.staffEventDashboard);
router.post('/scan', invitations.scanAsStaff);
router.post('/:id/accept', invitations.acceptInvitation);
router.post('/:id/reject', invitations.rejectInvitation);

export default router;
