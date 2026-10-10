/**
 * Organizer types, categories and category-specific "detail tracks" for event creation.
 *
 * This file is the single source of truth: the Event model builds its `details` sub-schemas
 * from DETAIL_TRACKS, the manager controller validates against it, and the client wizard
 * renders its forms from GET /api/v1/catalog/event-taxonomy. To add a category, subcategory
 * or detail field, edit this file only.
 *
 * Detail field types: text, textarea, number, boolean, select (needs options),
 * list (strings), schedule ({ time, title } rows), people ({ name, role } rows).
 * `private: true` fields are never sent to the public event page.
 */

export const ORGANIZER_TYPES = [
    { key: 'school', label: 'School / College / University', orgLabel: 'Institution name', orgRequired: true, tracks: ['education'] },
    { key: 'company', label: 'Company / Corporate Organization', orgLabel: 'Company name', orgRequired: true, tracks: [] },
    { key: 'agency', label: 'Event Management Agency', orgLabel: 'Agency name', orgRequired: true, tracks: [] },
    { key: 'individual', label: 'Individual / Personal Organizer', orgLabel: null, orgRequired: false, tracks: [] },
    { key: 'sports_club', label: 'Sports Club / Sports Academy', orgLabel: 'Club or academy name', orgRequired: true, tracks: [] },
    { key: 'ngo', label: 'NGO / Community Organization', orgLabel: 'Organization name', orgRequired: true, tracks: [] },
    { key: 'creator', label: 'Creator / Trainer / Educator', orgLabel: 'Brand or studio name', orgRequired: false, tracks: [] },
    { key: 'business', label: 'Shop / Brand / Business', orgLabel: 'Business name', orgRequired: true, tracks: [] },
    { key: 'travel', label: 'Travel Company / Experience Host', orgLabel: 'Company name', orgRequired: false, tracks: [] },
    { key: 'other', label: 'Other Organization', orgLabel: 'Organization name', orgRequired: false, tracks: [] }
];

export const CATEGORIES = [
    { key: 'Education', track: 'education', subcategories: ['Annual Function', 'College Fest', 'Workshop', 'Seminar', 'Science Exhibition', 'Sports Day', 'Competition', 'Convocation'] },
    { key: 'Corporate', track: 'corporate', subcategories: ['Conference', 'Team Building', 'Networking', 'Product Launch', 'Employee Celebration'] },
    { key: 'Entertainment', track: 'entertainment', subcategories: ['Concert', 'DJ Night', 'Comedy Show', 'Theatre', 'Open Mic', 'Festival'] },
    { key: 'Personal', track: 'personal', subcategories: ['Birthday', 'Wedding', 'Engagement', 'Anniversary', 'Reunion', 'Private Party'] },
    { key: 'Startup', track: 'corporate', subcategories: ['Hackathon', 'Pitch Event', 'Investor Meet', 'Demo Day', 'Networking'] },
    { key: 'Sports', track: 'sports', subcategories: ['Cricket', 'Football', 'Badminton', 'Marathon', 'Fitness', 'E-sports', 'Tournament'] },
    { key: 'Community', track: null, subcategories: ['Fundraiser', 'Charity', 'Cultural Festival', 'Volunteer Drive', 'Awareness Campaign'] },
    { key: 'Learning', track: 'learning', subcategories: ['Masterclass', 'Training', 'Coaching', 'Art Workshop', 'Cooking Class', 'Webinar'] },
    { key: 'Business', track: 'corporate', subcategories: ['Store Opening', 'Exhibition', 'Fashion Show', 'Pop-up Market', 'Brand Promotion'] },
    { key: 'Travel', track: 'travel', subcategories: ['Trekking', 'Camping', 'Group Trip', 'Heritage Walk', 'Adventure Activity'] }
];

export const EVENT_FORMATS = [
    { key: 'in_person', label: 'In-person' },
    { key: 'online', label: 'Online' },
    { key: 'hybrid', label: 'Hybrid' }
];

export const VISIBILITIES = [
    { key: 'public', label: 'Public', hint: 'Listed on UtsavX and in search.' },
    { key: 'private', label: 'Private', hint: 'Hidden from listings; only people with the link can find it. Guest list stays private.' }
];

export const REGISTRATION_MODES = [
    { key: 'paid', label: 'Paid tickets', hint: 'At least one paid ticket is required.' },
    { key: 'free', label: 'Free registration', hint: 'Free tickets are enough; paid tiers are optional.' }
];

export const DETAIL_TRACKS = {
    education: {
        label: 'School & education',
        fields: [
            { key: 'institutionName', label: 'School, college or institution', type: 'text' },
            { key: 'grades', label: 'Classes / grades taking part', type: 'list', placeholder: 'e.g. Class 6' },
            { key: 'sections', label: 'Sections or houses', type: 'list', placeholder: 'e.g. Red House' },
            { key: 'studentParticipants', label: 'Expected student participants', type: 'number', private: true, hint: 'A headcount only — UtsavX does not store student names.' },
            { key: 'teacherCoordinators', label: 'Teacher coordinators', type: 'people', private: true, roleLabel: 'Responsibility' },
            { key: 'activities', label: 'Timetable & activities', type: 'schedule' },
            { key: 'competitions', label: 'Competitions', type: 'list' },
            { key: 'certificates', label: 'Certificates will be issued', type: 'boolean' },
            { key: 'parentConsentRequired', label: 'Parent consent required to take part', type: 'boolean' },
            { key: 'photoConsentRequired', label: 'Photo consent required before sharing student photos', type: 'boolean' },
            { key: 'emergencyContactName', label: 'Emergency contact (staff) name', type: 'text', private: true },
            { key: 'emergencyContactPhone', label: 'Emergency contact phone', type: 'text', private: true, maxLength: 20 }
        ]
    },
    corporate: {
        label: 'Corporate & business',
        fields: [
            { key: 'department', label: 'Department or team', type: 'text' },
            { key: 'attendeeType', label: 'Who can attend', type: 'select', options: [
                { key: 'internal', label: 'Employees only' },
                { key: 'external', label: 'External attendees' },
                { key: 'both', label: 'Employees & external' }
            ] },
            { key: 'speakers', label: 'Speakers', type: 'people', roleLabel: 'Title / company' },
            { key: 'agenda', label: 'Agenda', type: 'schedule' },
            { key: 'networkingSessions', label: 'Networking sessions', type: 'schedule' }
        ]
    },
    sports: {
        label: 'Sports & tournaments',
        fields: [
            { key: 'sportType', label: 'Sport', type: 'text' },
            { key: 'participationType', label: 'Participation', type: 'select', options: [
                { key: 'individual', label: 'Individual' },
                { key: 'team', label: 'Teams' }
            ] },
            { key: 'tournamentFormat', label: 'Format', type: 'select', options: [
                { key: 'knockout', label: 'Knockout' },
                { key: 'league', label: 'League' },
                { key: 'round_robin', label: 'Round robin' },
                { key: 'single_match', label: 'Single match / race' }
            ] },
            { key: 'teams', label: 'Teams', type: 'list' },
            { key: 'fixtures', label: 'Fixtures & bracket', type: 'schedule', titleLabel: 'Match' },
            { key: 'referees', label: 'Referees & officials', type: 'people', roleLabel: 'Role' },
            { key: 'scoringRules', label: 'Scoring & rules', type: 'textarea' }
        ]
    },
    personal: {
        label: 'Personal celebration',
        fields: [
            { key: 'hostName', label: 'Hosted by', type: 'text' },
            { key: 'rsvpRequired', label: 'Ask guests to RSVP', type: 'boolean' },
            { key: 'guestLimit', label: 'Guest limit', type: 'number', private: true },
            { key: 'plusOnesAllowed', label: 'Guests may bring a plus-one', type: 'boolean' },
            { key: 'dressCode', label: 'Dress code', type: 'text' }
        ]
    },
    entertainment: {
        label: 'Performances',
        fields: [
            { key: 'performers', label: 'Performers & artists', type: 'people', roleLabel: 'Act' },
            { key: 'stageSchedule', label: 'Stage schedule', type: 'schedule' },
            { key: 'venueCapacity', label: 'Venue capacity', type: 'number' },
            { key: 'ageRestriction', label: 'Age restriction', type: 'select', options: [
                { key: 'all', label: 'All ages' },
                { key: '13+', label: '13+' },
                { key: '18+', label: '18+' },
                { key: '21+', label: '21+' }
            ] }
        ]
    },
    learning: {
        label: 'Workshop & learning',
        fields: [
            { key: 'instructorName', label: 'Instructor', type: 'text' },
            { key: 'instructorBio', label: 'About the instructor', type: 'textarea' },
            { key: 'skillLevel', label: 'Skill level', type: 'select', options: [
                { key: 'beginner', label: 'Beginner' },
                { key: 'intermediate', label: 'Intermediate' },
                { key: 'advanced', label: 'Advanced' },
                { key: 'all', label: 'All levels' }
            ] },
            { key: 'objectives', label: 'What attendees will learn', type: 'list' },
            { key: 'sessions', label: 'Session schedule', type: 'schedule' },
            { key: 'certificate', label: 'Certificate of completion', type: 'boolean' }
        ]
    },
    travel: {
        label: 'Trip & experience',
        fields: [
            { key: 'meetingPoint', label: 'Meeting point', type: 'text' },
            { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g. 2 days, 1 night' },
            { key: 'fitnessLevel', label: 'Fitness level', type: 'select', options: [
                { key: 'easy', label: 'Easy' },
                { key: 'moderate', label: 'Moderate' },
                { key: 'challenging', label: 'Challenging' }
            ] },
            { key: 'itinerary', label: 'Itinerary', type: 'schedule' },
            { key: 'requiredEquipment', label: 'What to bring', type: 'list' },
            { key: 'safetyInstructions', label: 'Safety instructions', type: 'textarea' }
        ]
    }
};

export const LIMITS = { text: 200, textarea: 3000, listItems: 50, listItem: 120, rows: 60, scheduleTime: 40 };

const organizerByKey = new Map(ORGANIZER_TYPES.map((row) => [row.key, row]));
const categoryByKey = new Map(CATEGORIES.map((row) => [row.key.toLowerCase(), row]));

export const findOrganizerType = (key) => organizerByKey.get(key) || null;
export const findCategory = (key) => categoryByKey.get(String(key || '').toLowerCase()) || null;

/** Detail tracks that apply to an organizer + category pair (e.g. school + Sports → education, sports). */
export function tracksFor(organizerType, category) {
    const tracks = [...(findOrganizerType(organizerType)?.tracks || [])];
    const categoryTrack = findCategory(category)?.track;
    if (categoryTrack && !tracks.includes(categoryTrack)) tracks.push(categoryTrack);
    return tracks.filter((key) => DETAIL_TRACKS[key]);
}

/** Public, JSON-safe taxonomy for the client wizard. */
export function publicTaxonomy() {
    return {
        organizerTypes: ORGANIZER_TYPES,
        categories: CATEGORIES,
        eventFormats: EVENT_FORMATS,
        visibilities: VISIBILITIES,
        registrationModes: REGISTRATION_MODES,
        detailTracks: DETAIL_TRACKS,
        limits: LIMITS
    };
}
