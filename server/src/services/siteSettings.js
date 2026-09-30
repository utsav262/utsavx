import SiteSetting from '../models/SiteSetting.js';

export const SOCIAL_KEYS = ['instagram', 'twitter', 'facebook', 'youtube', 'linkedin'];

/** Returns the site settings, creating the defaults the first time. */
export async function loadSiteSettings() {
    return SiteSetting.findOneAndUpdate({ key: 'site' }, { $setOnInsert: { key: 'site' } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
}

export const serializeSiteSettings = (s) => ({
    locations: s.locations || '',
    support_email: s.supportEmail || '',
    support_phone: s.supportPhone || '',
    support_hours: s.supportHours || '',
    office_address: s.officeAddress || '',
    social: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, s.social?.[k] || ''])),
    updated_at: s.updatedAt
});

/** Public: GET /api/v1/site-settings — contact details for the footer and Contact page. */
export async function publicSiteSettings(req, res) {
    const { updated_at: _ignored, ...settings } = serializeSiteSettings(await loadSiteSettings());
    // Always revalidate so admin edits show on the next page view.
    res.set('Cache-Control', 'no-cache');
    return res.json({ message: 'OK', code: 200, result: settings });
}
