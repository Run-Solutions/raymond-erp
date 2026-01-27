import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('Security & Multi-Tenancy (e2e)', () => {
    let app: INestApplication;
    let jwtService: JwtService;

    let orgA_User: any;
    let orgA_Token: string;
    let orgA_Id: string;

    let orgB_User: any;
    let orgB_Token: string;
    let orgB_Id: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        jwtService = moduleFixture.get<JwtService>(JwtService);

        // Setup: Create Org A
        const regA = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'admin@orga.com',
                password: 'password123',
                first_name: 'Admin',
                last_name: 'A',
                organizationName: 'Org A',
            })
            .expect(201);

        orgA_User = regA.body.user;
        orgA_Token = regA.body.accessToken;
        // Decode token to get orgId if not in response (it is in response usually? No, user object has it? No, user object has role/email/id)
        // But we added orgId to JWT.
        const decodedA = jwtService.decode(orgA_Token) as any;
        orgA_Id = decodedA.orgId;

        // Setup: Create Org B
        const regB = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email: 'admin@orgb.com',
                password: 'password123',
                first_name: 'Admin',
                last_name: 'B',
                organizationName: 'Org B',
            })
            .expect(201);

        orgB_User = regB.body.user;
        orgB_Token = regB.body.accessToken;
        const decodedB = jwtService.decode(orgB_Token) as any;
        orgB_Id = decodedB.orgId;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Tenant Isolation', () => {
        it('should allow access to own organization data', async () => {
            const response = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${orgA_Token}`)
                .set('X-Tenant-ID', orgA_Id)
                .expect(200);

            // Should contain Org A user
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ email: 'admin@orga.com' }),
                ]),
            );
            // Should NOT contain Org B user
            expect(response.body).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ email: 'admin@orgb.com' }),
                ]),
            );
        });

        it('should NOT allow access to other organization data (Cross-Tenant)', async () => {
            // Even if we try to spoof the header? Guard checks mismatch.
            // If we use Org A token, we see Org A data.
            // If we want to see Org B data with Org A token, we can't because Prisma filters by Context (Org A).

            const response = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${orgA_Token}`)
                .set('X-Tenant-ID', orgA_Id) // Valid header
                .expect(200);

            // Verify we don't see Org B users
            const orgBUsers = response.body.filter((u: any) => u.email === 'admin@orgb.com');
            expect(orgBUsers.length).toBe(0);
        });
    });

    describe('Security Guards & Middleware', () => {
        it('should block request with Mismatched Tenant Header', async () => {
            // User A (Org A) tries to send Header for Org B
            await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${orgA_Token}`)
                .set('X-Tenant-ID', orgB_Id) // Mismatch!
                .expect(401); // TenantGuard should throw "Tenant mismatch"
        });

        it('should block request with Invalid JWT (No orgId)', async () => {
            // Forge a token without orgId
            const badToken = jwtService.sign({
                sub: orgA_User.id,
                email: orgA_User.email,
                roles: 'ADMIN',
                // orgId missing
            });

            await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${badToken}`)
                .expect(401); // JwtStrategy should throw "Organization context missing" or "Invalid token payload"
        });

        it('should infer Tenant Context from JWT if Header is missing', async () => {
            // Our implementation allows this.
            const response = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${orgA_Token}`)
                // No X-Tenant-ID header
                .expect(200);

            // Should still filter correctly
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ email: 'admin@orga.com' }),
                ]),
            );
        });
    });
});
