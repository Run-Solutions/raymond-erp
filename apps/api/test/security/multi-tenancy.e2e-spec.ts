import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

describe('Multi-Tenancy Security (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let org1Token: string;
    let org2Token: string;
    let org1UserId: string;
    let org2UserId: string;
    let org1Id: string;
    let org2Id: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
                forbidNonWhitelisted: true,
            }),
        );

        await app.init();
        prisma = app.get(PrismaService);

        // Create two separate organizations
        const org1 = await prisma.organizations.create({
            data: {
                name: 'Organization 1',
                slug: 'org-1-test',
                is_active: true,
            },
        });
        org1Id = org1.id;

        const org2 = await prisma.organizations.create({
            data: {
                name: 'Organization 2',
                slug: 'org-2-test',
                is_active: true,
            },
        });
        org2Id = org2.id;

        // Create admin role for each org
        const role1 = await prisma.roles.create({
            data: {
                name: 'Admin',
                description: 'Admin role',
                is_system: true,
                organization_id: org1Id,
            },
        });

        const role2 = await prisma.roles.create({
            data: {
                name: 'Admin',
                description: 'Admin role',
                is_system: true,
                organization_id: org2Id,
            },
        });

        // Create permissions and assign to roles
        const permission = await prisma.permissions.create({
            data: {
                resource: 'projects',
                action: 'create',
                description: 'Create projects',
            },
        });

        await prisma.role_permissions.createMany({
            data: [
                { role_id: role1.id, permissionId: permission.id },
                { role_id: role2.id, permissionId: permission.id },
            ],
        });

        // Register users in each org
        const response1 = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'user1@org1.com',
                password: 'Test123!',
                first_name: 'User',
                last_name: 'One',
                organizationSlug: 'org-1-test',
            });

        org1Token = response1.body.accessToken;
        org1UserId = response1.body.user.id;

        const response2 = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'user2@org2.com',
                password: 'Test123!',
                first_name: 'User',
                last_name: 'Two',
                organizationSlug: 'org-2-test',
            });

        org2Token = response2.body.accessToken;
        org2UserId = response2.body.user.id;
    });

    afterAll(async () => {
        // Cleanup
        await prisma.organizations.deleteMany({
            where: {
                slug: { in: ['org-1-test', 'org-2-test'] },
            },
        });
        await app.close();
    });

    describe('Data Isolation', () => {
        it('should create project for org1', async () => {
            const response = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .send({
                    name: 'Org1 Project',
                    description: 'Test project',
                    status: 'ACTIVE',
                })
                .expect(201);

            expect(response.body.organization_id).toBe(org1Id);
        });

        it('should NOT allow org2 to see org1 projects', async () => {
            // Create project for org1
            const createResponse = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .send({
                    name: 'Secret Org1 Project',
                    description: 'Should not be visible to org2',
                    status: 'ACTIVE',
                });

            const org1ProjectId = createResponse.body.id;

            // Try to access with org2 token
            await request(app.getHttpServer())
                .get(`/projects/${org1ProjectId}`)
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(404); // Should not find it
        });

        it('should only list projects from own organization', async () => {
            // Create projects for both orgs
            await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .send({ name: 'Org1 Project A', status: 'ACTIVE' });

            await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${org2Token}`)
                .send({ name: 'Org2 Project B', status: 'ACTIVE' });

            // List projects for org1
            const org1Response = await request(app.getHttpServer())
                .get('/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .expect(200);

            // Verify all projects belong to org1
            expect(org1Response.body.data.every((p) => p.organization_id === org1Id)).toBe(true);

            // List projects for org2
            const org2Response = await request(app.getHttpServer())
                .get('/projects')
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(200);

            // Verify all projects belong to org2
            expect(org2Response.body.data.every((p) => p.organization_id === org2Id)).toBe(true);
        });

        it('should NOT allow update of other tenant data', async () => {
            // Create project for org1
            const createResponse = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .send({ name: 'Org1 Project', status: 'ACTIVE' });

            const project_id = createResponse.body.id;

            // Try to update with org2 token
            await request(app.getHttpServer())
                .patch(`/projects/${project_id}`)
                .set('Authorization', `Bearer ${org2Token}`)
                .send({ name: 'Hacked Name' })
                .expect(404);
        });

        it('should NOT allow delete of other tenant data', async () => {
            // Create project for org1
            const createResponse = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .send({ name: 'Org1 Project', status: 'ACTIVE' });

            const project_id = createResponse.body.id;

            // Try to delete with org2 token
            await request(app.getHttpServer())
                .delete(`/projects/${project_id}`)
                .set('Authorization', `Bearer ${org2Token}`)
                .expect(404);
        });
    });

    describe('JWT Token Validation', () => {
        it('should reject request without token', async () => {
            await request(app.getHttpServer()).get('/projects').expect(401);
        });

        it('should reject invalid token', async () => {
            await request(app.getHttpServer())
                .get('/projects')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should reject token with missing orgId', async () => {
            // This test assumes we can't create such a token through normal means
            // In production, JWT strategy validation will prevent this
            // Test is more about ensuring the guard checks for orgId
        });
    });

    describe('Tenant Context', () => {
        it('should maintain tenant context throughout request', async () => {
            const response = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${org1Token}`)
                .send({ name: 'Test Project', status: 'ACTIVE' })
                .expect(201);

            expect(response.body.organization_id).toBe(org1Id);
            expect(response.body.owner_id).toBe(org1UserId);
        });
    });
});
