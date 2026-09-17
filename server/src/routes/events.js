import { Router } from 'express';
import { wrapControllers } from '../middleware/asyncHandler.js';
import * as eventFns from '../controllers/eventController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const {
    cityEventCounts,
    createEvent,
    eventBooking,
    getCategories,
    getCities,
    getCountryList,
    getEvent,
    getRelatedEvents,
    legacyEventDetails,
    legacyListEvents,
    listByEventType,
    listEvents,
    updateEvent
} = wrapControllers(eventFns);

const router = Router();

router.get('/list', legacyListEvents);
router.get('/list-by-type', requireAuth, listByEventType);
router.get('/city-counts', cityEventCounts);
router.get('/details/:slug', legacyEventDetails);
router.get('/:id/related', getRelatedEvents);
router.get('/booking', eventBooking);
router.post('/booking', eventBooking);
router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', requireAuth, requireRole('organizer', 'admin'), createEvent);
router.patch('/:id', requireAuth, requireRole('organizer', 'admin'), updateEvent);

export {
    getCategories,
    getCities,
    getCountryList,
    cityEventCounts,
    listByEventType
};

export default router;
