import { z } from 'zod';
import SiteSetting from '../../models/SiteSetting.js';
import { invalidateCatalogCache } from '../../services/cacheService.js';
import { loadSiteSettings, serializeSiteSettings, SOCIAL_KEYS } from '../../services/siteSettings.js';
import { audit } from '../middleware/audit.js';
import { parseBody } from '../services/listing.js';

const url = z.string().trim().max(300).refine((v) => !v || /^https:\/\/\S+$/.test(v), 'Use a full https:// link, or leave empty');

const schema = z.object({
    locations: z.string().trim().max(120),
    support_email: z.string().trim().max(254).refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
    support_phone: z.string().trim().max(24).refine((v) => !v || /^\+?[0-9 ()-]{7,24}$/.test(v), 'Enter a valid phone number'),
    support_hours: z.string().trim().max(80),
    office_address: z.string().trim().max(300),
    social: z.object(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, url.optional().default('')])))
});

export async function get(req, res) {
    return res.json({ message: 'OK', code: 200, result: serializeSiteSettings(await loadSiteSettings()) });
}

export async function update(req, res) {
    const data = parseBody(schema, req, res);
    if (!data) return undefined;
    const before = await loadSiteSettings();
    const doc = await SiteSetting.findOneAndUpdate({ key: 'site' }, {
        $set: {
            locations: data.locations,
            supportEmail: data.support_email,
            supportPhone: data.support_phone,
            supportHours: data.support_hours,
            officeAddress: data.office_address,
            social: data.social
        }
    }, { new: true }).lean();
    await invalidateCatalogCache();
    await audit(req, { action: 'site_settings.update', targetType: 'SiteSetting', targetId: doc._id, before: serializeSiteSettings(before), after: serializeSiteSettings(doc) });
    return res.json({ message: 'Site settings saved', code: 200, result: serializeSiteSettings(doc) });
}
