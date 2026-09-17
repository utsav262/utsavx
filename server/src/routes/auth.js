import { Router } from 'express';
import { wrapControllers } from '../middleware/asyncHandler.js';
import * as authFns from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validators/auth.js';

const { login, logout, me, register, becomeOrganizer } = wrapControllers(authFns);
const router = Router();
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.post('/become-organizer', requireAuth, becomeOrganizer);
router.post('/logout', requireAuth, logout);
export default router;
