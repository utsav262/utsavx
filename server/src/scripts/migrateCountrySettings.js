import mongoose from 'mongoose';

/**
 * One-time rename of country settings from the old field layout to the current one.
 * Idempotent: only touches documents that still carry old fields. Runs on every boot.
 */
export async function migrateCountrySettings() {
    const col = mongoose.connection.db.collection('globalsettings');
    const old = await col.find({ Online_Service_Fee_percentage: { $exists: true } }).toArray();
    for (const doc of old) {
        let timezones = [];
        try {
            const parsed = Array.isArray(doc.timezone) ? doc.timezone : JSON.parse(doc.timezone || '[]');
            timezones = (Array.isArray(parsed) ? parsed : []).map((z) => ({ label: String(z.label || z.value), value: String(z.value) }));
        } catch { /* keep default below */ }
        await col.updateOne({ _id: doc._id }, {
            $set: {
                serviceFeePercent: Number(doc.Online_Service_Fee_percentage) || 0,
                serviceFeeFlat: Number(doc.Online_Service_Fee_dollar_amount) || 0,
                paymentFeePercent: Number(doc.Online_Payment_Fee_percentage) || 0,
                paymentFeeFlat: Number(doc.Online_Payment_Fee_dollar_amount) || 0,
                paymentGateway: doc.payment_gateway || 'razorpay',
                timezones: timezones.length ? timezones : [{ label: 'India Standard Time', value: 'Asia/Kolkata' }]
            },
            $unset: {
                Online_Service_Fee_percentage: '', Online_Service_Fee_dollar_amount: '',
                Online_Payment_Fee_percentage: '', Online_Payment_Fee_dollar_amount: '',
                payment_gateway: '', timezone: '', country_id: '',
                verified_ambassador_unlock_fee: '', ticket_outlet_unlock_fee: '', boost_package_unlock_fee: '', complimentary_ticket_bundles: ''
            }
        });
    }
    // The old unique index on country_id would reject new countries once the field is gone.
    const indexes = await col.indexes().catch(() => []);
    if (indexes.some((i) => i.name === 'country_id_1')) await col.dropIndex('country_id_1').catch(() => {});
    if (old.length) console.log(`Migrated ${old.length} country setting(s) to the current field names`);
}
