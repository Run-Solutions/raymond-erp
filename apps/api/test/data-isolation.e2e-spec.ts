import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * CRITICAL DATA ISOLATION TEST
 * Validates that organizations are 100% isolated
 * NO data should leak between organizations
 */
describe('Data Isolation (e2e) - CRITICAL', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    // Test users and tokens
    let org1UserId: string;
    let org2UserId: string;
    let org1Token: string;
    let org2Token: string;
    let org1Id: string;
    let org2Id: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Get organizations
        const orgs = await prisma.organizations.findMany({ take: 2 });
        org1Id = orgs[0].id;
        org2Id = orgs[1].id;

        // Get users from each organization
        const org1User = await prisma.users.findFirst({
            where: { organization_id: org1Id },
            include: { roles: true },
        });
        const org2User = await prisma.users.findFirst({
            where: { organization_id: org2Id },
            include: { roles: true },
        });

        org1UserId = org1User.id;
        org2UserId = org2User.id;

        // Login users to get tokens
        const login1 = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: org1User.email,
                password: 'Admin123!', // Assuming test password
            });

        const login2 = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
                email: org2User.email,
                password: 'Admin123!',
            });

        org1Token = login1.body.data?.accessToken;
        org2Token = login2.body.data?.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('🔴 CRITICAL: Projects Isolation', () => {
        it('should NOT return Org2 projects when Org1 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .expect(200);

            const projects = response.body.data || response.body;

            // CRITICAL: Every project MUST belong to org1
            projects.forEach((project: any) => {
                expect(project.organization_id).toBe(org1Id);
                expect(project.organization_id).not.toBe(org2Id);
            });

            console.log(`✅ Org1 projects: ${projects.length} (all belong to org1)`);
        });

        it('should NOT return Org1 projects when Org2 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/projects')
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(200);

            const projects = response.body.data || response.body;

            // CRITICAL: Every project MUST belong to org2
            projects.forEach((project: any) => {
                expect(project.organization_id).toBe(org2Id);
                expect(project.organization_id).not.toBe(org1Id);
            });

            console.log(`✅ Org2 projects: ${projects.length} (all belong to org2)`);
        });

        it('should REJECT access to Org2 project by Org1 user', async () => {
            // Get a project from org2
            const org2Project = await prisma.projects.findFirst({
                where: { organization_id: org2Id },
            });

            if (org2Project) {
                await request(app.getHttpServer())
                    .get(`/api/projects/${org2Project.id}`)
                    .set('Authorization', `Bearer ${org1Token}`)
                    .expect(404); // Should not find it (tenant filter)
            }
        });
    });

    describe('🔴 CRITICAL: Tasks Isolation', () => {
        it('should NOT return Org2 tasks when Org1 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/tasks')
                .set('Authorization', `Bearer ${org1Token}`)
                .expect(200);

            const tasks = response.body.data || response.body;

            tasks.forEach((task: any) => {
                expect(task.organization_id).toBe(org1Id);
            });

            console.log(`✅ Org1 tasks: ${tasks.length} (all belong to org1)`);
        });

        it('should NOT return Org1 tasks when Org2 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/tasks')
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(200);

            const tasks = response.body.data || response.body;

            tasks.forEach((task: any) => {
                expect(task.organization_id).toBe(org2Id);
            });

            console.log(`✅ Org2 tasks: ${tasks.length} (all belong to org2)`);
        });
    });

    describe('🔴 CRITICAL: Clients Isolation', () => {
        it('should NOT return Org2 clients when Org1 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/clients')
                .set('Authorization', `Bearer ${org1Token}`)
                .expect(200);

            const clients = response.body.data || response.body;

            clients.forEach((client: any) => {
                expect(client.organization_id).toBe(org1Id);
            });

            console.log(`✅ Org1 clients: ${clients.length} (all belong to org1)`);
        });

        it('should NOT return Org1 clients when Org2 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/clients')
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(200);

            const clients = response.body.data || response.body;

            clients.forEach((client: any) => {
                expect(client.organization_id).toBe(org2Id);
            });

            console.log(`✅ Org2 clients: ${clients.length} (all belong to org2)`);
        });
    });

    describe('🔴 CRITICAL: Suppliers Isolation', () => {
        it('should NOT return Org2 suppliers when Org1 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/suppliers')
                .set('Authorization', `Bearer ${org1Token}`)
                .expect(200);

            const suppliers = response.body.data || response.body;

            suppliers.forEach((supplier: any) => {
                expect(supplier.organization_id).toBe(org1Id);
            });

            console.log(`✅ Org1 suppliers: ${suppliers.length} (all belong to org1)`);
        });

        it('should NOT return Org1 suppliers when Org2 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/suppliers')
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(200);

            const suppliers = response.body.data || response.body;

            suppliers.forEach((supplier: any) => {
                expect(supplier.organization_id).toBe(org2Id);
            });

            console.log(`✅ Org2 suppliers: ${suppliers.length} (all belong to org2)`);
        });
    });

    describe('🔴 CRITICAL: Financial Data Isolation', () => {
        it('should NOT return Org2 accounts payable when Org1 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/finance/accounts-payable')
                .set('Authorization', `Bearer ${org1Token}`);

            if (response.status === 200) {
                const ap = response.body.data || response.body;
                ap.forEach((item: any) => {
                    expect(item.organization_id).toBe(org1Id);
                });
                console.log(`✅ Org1 AP: ${ap.length} (all belong to org1)`);
            }
        });

        it('should NOT return Org2 accounts receivable when Org1 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/finance/accounts-receivable')
                .set('Authorization', `Bearer ${org1Token}`);

            if (response.status === 200) {
                const ar = response.body.data || response.body;
                ar.forEach((item: any) => {
                    expect(item.organization_id).toBe(org1Id);
                });
                console.log(`✅ Org1 AR: ${ar.length} (all belong to org1)`);
            }
        });

        it('should NOT return Org2 invoices when Org1 user requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/finance/invoices')
                .set('Authorization', `Bearer ${org1Token}`);

            if (response.status === 200) {
                const invoices = response.body.data || response.body;
                invoices.forEach((invoice: any) => {
                    expect(invoice.organization_id).toBe(org1Id);
                });
                console.log(`✅ Org1 invoices: ${invoices.length} (all belong to org1)`);
            }
        });
    });

    describe('🔴 CRITICAL: Users Isolation', () => {
        it('should NOT return Org2 users when Org1 admin requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/users')
                .set('Authorization', `Bearer ${org1Token}`);

            if (response.status === 200) {
                const users = response.body.data || response.body;
                users.forEach((user: any) => {
                    expect(user.organization_id).toBe(org1Id);
                });
                console.log(`✅ Org1 users: ${users.length} (all belong to org1)`);
            }
        });

        it('should NOT return Org1 users when Org2 admin requests', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/users')
                .set('Authorization', `Bearer ${org2Token}`);

            if (response.status === 200) {
                const users = response.body.data || response.body;
                users.forEach((user: any) => {
                    expect(user.organization_id).toBe(org2Id);
                });
                console.log(`✅ Org2 users: ${users.length} (all belong to org2)`);
            }
        });
    });

    describe('🔴 CRITICAL: Organization Stats Isolation', () => {
        it('should return ONLY Org1 stats for Org1 user', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/organization/stats')
                .set('Authorization', `Bearer ${org1Token}`)
                .expect(200);

            const stats = response.body.data || response.body;

            // Verify counts match ONLY org1 data
            const org1Projects = await prisma.projects.count({
                where: { organization_id: org1Id },
            });
            const org1Tasks = await prisma.tasks.count({
                where: { organization_id: org1Id },
            });
            const org1Clients = await prisma.clients.count({
                where: { organization_id: org1Id, is_active: true },
            });

            expect(stats.projects).toBe(org1Projects);
            expect(stats.tasks).toBe(org1Tasks);
            expect(stats.clients).toBe(org1Clients);

            console.log(`✅ Org1 stats verified: ${org1Projects} projects, ${org1Tasks} tasks, ${org1Clients} clients`);
        });

        it('should return ONLY Org2 stats for Org2 user', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/organization/stats')
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(200);

            const stats = response.body.data || response.body;

            // Verify counts match ONLY org2 data
            const org2Projects = await prisma.projects.count({
                where: { organization_id: org2Id },
            });
            const org2Tasks = await prisma.tasks.count({
                where: { organization_id: org2Id },
            });
            const org2Clients = await prisma.clients.count({
                where: { organization_id: org2Id, is_active: true },
            });

            expect(stats.projects).toBe(org2Projects);
            expect(stats.tasks).toBe(org2Tasks);
            expect(stats.clients).toBe(org2Clients);

            console.log(`✅ Org2 stats verified: ${org2Projects} projects, ${org2Tasks} tasks, ${org2Clients} clients`);
        });
    });

    describe('🔴 CRITICAL: Cross-Tenant Access Attempts', () => {
        it('should REJECT Org1 user trying to access Org2 data with org header manipulation', async () => {
            await request(app.getHttpServer())
                .get('/api/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .set('x-org-id', org2Id) // Trying to manipulate header
                .expect((res) => {
                    // Should still only return org1 projects (JWT takes precedence)
                    const projects = res.body.data || res.body;
                    if (projects.length > 0) {
                        projects.forEach((project: any) => {
                            expect(project.organization_id).toBe(org1Id);
                        });
                    }
                });
        });
    });
});
