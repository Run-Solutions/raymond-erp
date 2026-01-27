import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * E2E Tests for Financial Security (5 Layers)
 * 
 * These tests validate that the 5-layer financial security system
 * prevents unauthorized roles from accessing financial data.
 */

describe('Financial Security E2E Tests', () => {
    let app: INestApplication;
    let superadminToken: string;
    let cfoToken: string;
    let pmToken: string;
    let developerToken: string;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        // Create test users and get tokens
        // Superadmin
        const superadminRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'superadmin@test.com',
                password: 'Test123!',
                first_name: 'Super',
                last_name: 'Admin',
                organizationName: 'Test Org',
            });
        superadminToken = superadminRes.body.accessToken;

        // CFO (has financial access)
        const cfoRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'cfo@test.com',
                password: 'Test123!',
                first_name: 'Chief',
                last_name: 'Financial',
                organizationName: 'Test Org 2',
            });
        cfoToken = cfoRes.body.accessToken;

        // Project Manager (NO financial access)
        const pmRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'pm@test.com',
                password: 'Test123!',
                first_name: 'Project',
                last_name: 'Manager',
                organizationName: 'Test Org 3',
            });
        pmToken = pmRes.body.accessToken;

        // Developer (NO financial access)
        const devRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'dev@test.com',
                password: 'Test123!',
                first_name: 'Dev',
                last_name: 'User',
                organizationName: 'Test Org 4',
            });
        developerToken = devRes.body.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Layer 2: FinancialGuard (Controller Level)', () => {
        it('should allow Superadmin to access finance/accounts', async () => {
            const res = await request(app.getHttpServer())
                .get('/finance/accounts')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.status).toBe(200);
        });

        it('should allow CFO to access finance/accounts', async () => {
            const res = await request(app.getHttpServer())
                .get('/finance/accounts')
                .set('Authorization', `Bearer ${cfoToken}`);

            expect(res.status).toBe(200);
        });

        it('should DENY Project Manager access to finance/accounts', async () => {
            const res = await request(app.getHttpServer())
                .get('/finance/accounts')
                .set('Authorization', `Bearer ${pmToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Financial module access is restricted');
        });

        it('should DENY Developer access to finance/accounts', async () => {
            const res = await request(app.getHttpServer())
                .get('/finance/accounts')
                .set('Authorization', `Bearer ${developerToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Financial module access is restricted');
        });

        it('should DENY PM access to finance/journal-entries', async () => {
            const res = await request(app.getHttpServer())
                .get('/finance/journal-entries')
                .set('Authorization', `Bearer ${pmToken}`);

            expect(res.status).toBe(403);
        });

        it('should DENY PM access to finance/reports', async () => {
            const res = await request(app.getHttpServer())
                .get('/finance/reports/trial-balance')
                .set('Authorization', `Bearer ${pmToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('Layer 3: RBAC Permissions', () => {
        it('should validate financial permissions for CFO', async () => {
            // CFO should have finance:read permission
            const res = await request(app.getHttpServer())
                .get('/finance/accounts')
                .set('Authorization', `Bearer ${cfoToken}`);

            expect(res.status).toBe(200);
        });

        it('should validate NO financial permissions for PM', async () => {
            const res = await request(app.getHttpServer())
                .get('/finance/accounts')
                .set('Authorization', `Bearer ${pmToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('Cross-Module Access Validation', () => {
        it('should allow PM to access projects module', async () => {
            const res = await request(app.getHttpServer())
                .get('/projects')
                .set('Authorization', `Bearer ${pmToken}`);

            expect(res.status).toBe(200);
        });

        it('should allow PM to access tasks module', async () => {
            const res = await request(app.getHttpServer())
                .get('/tasks')
                .set('Authorization', `Bearer ${pmToken}`);

            expect(res.status).toBe(200);
        });

        it('should DENY PM access to ANY finance endpoint', async () => {
            const endpoints = [
                '/finance/accounts',
                '/finance/journal-entries',
                '/finance/reports/trial-balance',
                '/finance/reports/income-statement',
                '/finance/reports/balance-sheet',
            ];

            for (const endpoint of endpoints) {
                const res = await request(app.getHttpServer())
                    .get(endpoint)
                    .set('Authorization', `Bearer ${pmToken}`);

                expect(res.status).toBe(403);
            }
        });
    });

    describe('Data Leakage Prevention', () => {
        it('should NOT expose financial data in project responses for PM', async () => {
            // Create a project with budget (if schema supports it)
            const createRes = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${pmToken}`)
                .send({
                    name: 'Test Project',
                    description: 'Test',
                    budget: 100000, // Financial field
                });

            // Get the project
            const getRes = await request(app.getHttpServer())
                .get(`/projects/${createRes.body.id}`)
                .set('Authorization', `Bearer ${pmToken}`);

            // Budget field should be filtered out by FinancialDataInterceptor
            expect(getRes.body.budget).toBeUndefined();
        });
    });
});
