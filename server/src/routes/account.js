import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrapControllers } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import * as accountFns from '../controllers/accountController.js';
import { avatarUpload } from '../controllers/accountController.js';
import { passwordSchema, payoutBankSchema, profileSchema } from '../validators/account.js';

const account = wrapControllers(accountFns);
const router = Router();
router.get('/avatar/:userId', account.avatar);

router.use(requireAuth);
router.get('/profile', account.getProfile);
router.patch('/profile', validate(profileSchema), account.updateProfile);
router.post('/password', validate(passwordSchema), account.changePassword);
router.post('/avatar', avatarUpload, account.uploadAvatar);
router.delete('/avatar', account.deleteAvatar);

router.get('/payout-bank', requireRole('organizer'), account.getPayoutBank);
router.put('/payout-bank', requireRole('organizer'), validate(payoutBankSchema), account.updatePayoutBank);
router.delete('/payout-bank', requireRole('organizer'), account.deletePayoutBank);
export default router;
