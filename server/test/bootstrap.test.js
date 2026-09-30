import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import AdminUser from '../src/models/AdminUser.js';
import { bootstrapSuperAdmin } from '../src/admin/bootstrap.js';

beforeAll(async () => {
    await mongoose.connect(env.mongoUri.replace(/\/([^/?]+)(\?|$)/, '/utsavx_test_bootstrap$2'));
    await mongoose.connection.db.dropDatabase();
});
afterAll(async () => { await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); });

describe('bootstrapSuperAdmin', () => {
    it('creates once and never overwrites', async () => {
        process.env.ADMIN_BOOTSTRAP_EMAIL = 'boot@x.io';
        process.env.ADMIN_BOOTSTRAP_PASSWORD = 'First-pass-123';
        await bootstrapSuperAdmin();
        const first = await AdminUser.findOne({ email: 'boot@x.io' });
        expect(first.role).toBe('super_admin');
        process.env.ADMIN_BOOTSTRAP_PASSWORD = 'Second-pass-456';
        await bootstrapSuperAdmin();
        const again = await AdminUser.findOne({ email: 'boot@x.io' });
        expect(again.passwordHash).toBe(first.passwordHash);
        delete process.env.ADMIN_BOOTSTRAP_EMAIL; delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
    });
});
