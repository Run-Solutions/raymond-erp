import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { randomUUID } from 'crypto';

/**
 * Security Tests for Roles and Permissions Module
 *
 * Tests validate:
 * 1. SUPERADMIN can manage all roles and permissions
 * 2. CEO cannot manage SUPERADMIN roles or permissions
 * 3. CEO cannot assign is_superadmin_only permissions
 * 4. CEO cannot create/modify/delete roles with level >= 100
 */
describe('Roles & Permissions Security (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    let testOrg: any;
    let superadminUser: any;
    let ceoUser: any;
    let superadminToken: string;
    let ceoToken: string;

    let superadminRole: any;
    let ceoRole: any;
    let testRole: any;
    let superadminOnlyPermission: any;
    let regularPermission: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Setup test data
        await setupTestData();
    });

    afterAll(async () => {
        // Cleanup
        await cleanupTestData();
        await app.close();
    });

    async function setupTestData() {
        // Create test organization
        testOrg = await prisma.organizations.create({
            data: {
                id: randomUUID(),
                name: 'Security Test Org',
                slug: `security-test-${Date.now()}`,
                contact_email: 'test@example.com',
            },
        });

        // Create roles
        superadminRole = await prisma.roles.create({
            data: {
                id: randomUUID(),
                name: 'Superadmin',
                level: 100,
                is_system: true,
                organization_id: testOrg.id,
            },
        });

        ceoRole = await prisma.roles.create({
            data: {
                id: randomUUID(),
                name: 'CEO',
                level: 90,
                is_system: true,
                organization_id: testOrg.id,
            },
        });

        testRole = await prisma.roles.create({
            data: {
                id: randomUUID(),
                name: 'Test Manager',
                level: 60,
                organization_id: testOrg.id,
            },
        });

        // Create permissions
        superadminOnlyPermission = await prisma.permissions.create({
            data: {
                id: randomUUID(),
                resource: 'system',
                action: 'configure',
                description: 'Configure system settings',
                is_superadmin_only: true,
                updated_at: new Date(),
            },
        });

        regularPermission = await prisma.permissions.create({
            data: {
                id: randomUUID(),
                resource: 'users',
                action: 'read',
                description: 'Read users',
                is_superadmin_only: false,
                updated_at: new Date(),
            },
        });

        // Create users
        superadminUser = await prisma.users.create({
            data: {
                id: randomUUID(),
                first_name: 'Super',
                last_name: 'Admin',
                email: `superadmin-${Date.now()}@test.com`,
                password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // hashed password
                organization_id: testOrg.id,
                role_id: superadminRole.id,
            },
        });

        ceoUser = await prisma.users.create({
            data: {
                id: randomUUID(),
                first_name: 'CEO',
                last_name: 'User',
                email: `ceo-${Date.now()}@test.com`,
                password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // hashed password
                organization_id: testOrg.id,
                role_id: ceoRole.id,
            },
        });

        // Generate tokens (simplified for testing)
        // In real tests, you would authenticate properly
        superadminToken = 'superadmin-test-token';
        ceoToken = 'ceo-test-token';
    }

    async function cleanupTestData() {
        if (testOrg) {
            await prisma.users.deleteMany({ where: { organization_id: testOrg.id } });
            await prisma.role_permissions.deleteMany({
                where: {
                    role_id: {
                        in: [superadminRole?.id, ceoRole?.id, testRole?.id].filter(Boolean),
                    },
                },
            });
            await prisma.roles.deleteMany({ where: { organization_id: testOrg.id } });
            await prisma.permissions.deleteMany({
                where: {
                    id: {
                        in: [superadminOnlyPermission?.id, regularPermission?.id].filter(Boolean),
                    },
                },
            });
            await prisma.organizations.delete({ where: { id: testOrg.id } });
        }
    }

    describe('Role Creation Security', () => {
        it('CEO should NOT be able to create roles with level >= 100', async () => {
            const response = await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    name: 'Illegal Super Role',
                    level: 100,
                })
                .expect(400);

            expect(response.body.message).toContain('cannot create roles with level');
        });

        it('CEO should be able to create roles with level <= 90', async () => {
            const response = await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    name: 'Manager Role',
                    level: 60,
                });

            expect([201, 409]).toContain(response.status); // 201 created or 409 already exists
        });

        it('SUPERADMIN should be able to create roles with level >= 100', async () => {
            const response = await request(app.getHttpServer())
                .post('/roles')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'Admin Level Role',
                    level: 100,
                });

            expect([201, 409]).toContain(response.status);
        });
    });

    describe('Permission Assignment Security', () => {
        it('CEO should NOT be able to assign is_superadmin_only permissions', async () => {
            const response = await request(app.getHttpServer())
                .put(`/roles/${testRole.id}/permissions`)
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    permissionIds: [superadminOnlyPermission.id],
                })
                .expect(400);

            expect(response.body.message).toContain('superadmin-only');
        });

        it('CEO should be able to assign regular permissions', async () => {
            const response = await request(app.getHttpServer())
                .put(`/roles/${testRole.id}/permissions`)
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    permissionIds: [regularPermission.id],
                });

            expect([200, 404]).toContain(response.status);
        });

        it('SUPERADMIN should be able to assign is_superadmin_only permissions', async () => {
            const response = await request(app.getHttpServer())
                .put(`/roles/${testRole.id}/permissions`)
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    permissionIds: [superadminOnlyPermission.id, regularPermission.id],
                });

            expect([200, 404]).toContain(response.status);
        });
    });

    describe('Permission Management Security', () => {
        it('CEO should NOT be able to create is_superadmin_only permissions', async () => {
            const response = await request(app.getHttpServer())
                .post('/permissions')
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    resource: 'system',
                    action: 'delete',
                    is_superadmin_only: true,
                })
                .expect(400);

            expect(response.body.message).toContain('superadmin-only');
        });

        it('CEO should be able to create regular permissions', async () => {
            const response = await request(app.getHttpServer())
                .post('/permissions')
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    resource: 'reports',
                    action: 'read',
                    is_superadmin_only: false,
                });

            expect([201, 409]).toContain(response.status);
        });

        it('SUPERADMIN should be able to create is_superadmin_only permissions', async () => {
            const response = await request(app.getHttpServer())
                .post('/permissions')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    resource: 'system',
                    action: 'shutdown',
                    is_superadmin_only: true,
                });

            expect([201, 409]).toContain(response.status);
        });

        it('CEO should NOT be able to modify is_superadmin_only permissions', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/permissions/${superadminOnlyPermission.id}`)
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    description: 'Modified description',
                })
                .expect(400);

            expect(response.body.message).toContain('superadmin-only');
        });

        it('CEO should NOT be able to delete is_superadmin_only permissions', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/permissions/${superadminOnlyPermission.id}`)
                .set('Authorization', `Bearer ${ceoToken}`)
                .expect(400);

            expect(response.body.message).toContain('superadmin-only');
        });
    });

    describe('Superadmin Role Protection', () => {
        it('CEO should NOT be able to modify Superadmin role', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/roles/${superadminRole.id}`)
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    description: 'Modified by CEO',
                })
                .expect(400);

            expect(response.body.message).toContain('Superadmin');
        });

        it('CEO should NOT be able to delete Superadmin role', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/roles/${superadminRole.id}`)
                .set('Authorization', `Bearer ${ceoToken}`)
                .expect(400);

            expect(response.body.message).toContain('Superadmin');
        });

        it('CEO should NOT be able to modify Superadmin role permissions', async () => {
            const response = await request(app.getHttpServer())
                .put(`/roles/${superadminRole.id}/permissions`)
                .set('Authorization', `Bearer ${ceoToken}`)
                .send({
                    permissionIds: [regularPermission.id],
                })
                .expect(400);

            expect(response.body.message).toContain('Superadmin');
        });

        it('CEO should NOT see Superadmin role in list', async () => {
            const response = await request(app.getHttpServer())
                .get('/roles')
                .set('Authorization', `Bearer ${ceoToken}`)
                .expect(200);

            const roleNames = response.body.map((r: any) => r.name);
            expect(roleNames).not.toContain('Superadmin');
        });
    });
});
