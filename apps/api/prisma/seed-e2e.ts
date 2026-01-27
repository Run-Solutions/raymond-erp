import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting E2E Seeding...');

    // 1. Clean up (optional, but good for idempotency if we delete by email)
    // We won't delete everything to avoid wiping existing data if any, but we'll upsert.

    // 2. Create Organizations
    const orgA = await prisma.organizations.upsert({
        where: { slug: 'org-a' },
        update: {},
        create: {
            id: require('crypto').randomUUID(),
            name: 'Organization A',
            slug: 'org-a',
            updated_at: new Date(),
        } as any,
    });
    console.log(`✅ Organization A created: ${orgA.id}`);

    const orgB = await prisma.organizations.upsert({
        where: { slug: 'org-b' },
        update: {},
        create: {
            id: require('crypto').randomUUID(),
            name: 'Organization B',
            slug: 'org-b',
            updated_at: new Date(),
        } as any,
    });
    console.log(`✅ Organization B created: ${orgB.id}`);

    // 3. Create Roles for Org A
    const roles = [
        { name: 'Superadmin', level: 10, category: 'executive' },
        { name: 'CFO', level: 8, category: 'financial' },
        { name: 'CTO', level: 8, category: 'technical' },
        { name: 'PM', level: 5, category: 'operational' },
        { name: 'Developer', level: 3, category: 'technical' },
    ];

    const roleMap: Record<string, string> = {};

    for (const r of roles) {
        const role = await prisma.roles.upsert({
            where: { name_organization_id: { name: r.name, organization_id: orgA.id } },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                name: r.name,
                level: r.level,
                category: r.category,
                organization_id: orgA.id,
            } as any,
        });
        roleMap[r.name] = role.id;
        console.log(`   Role ${r.name} created.`);
    }

    // Create Superadmin for Org B
    const roleOrgB = await prisma.roles.upsert({
        where: { name_organization_id: { name: 'Superadmin', organization_id: orgB.id } },
        update: {},
        create: {
            id: require('crypto').randomUUID(),
            name: 'Superadmin',
            level: 10,
            category: 'executive',
            organization_id: orgB.id,
        } as any,
    });

    // 4. Create Users
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const users = [
        { email: 'admin@raymond.com', roles: 'Superadmin', first_name: 'Admin', last_name: 'User', orgId: orgA.id, role_id: roleMap['Superadmin'] },
        { email: 'cfo@raymond.com', roles: 'CFO', first_name: 'CFO', last_name: 'User', orgId: orgA.id, role_id: roleMap['CFO'] },
        { email: 'cto@raymond.com', roles: 'CTO', first_name: 'CTO', last_name: 'User', orgId: orgA.id, role_id: roleMap['CTO'] },
        { email: 'pm@raymond.com', roles: 'PM', first_name: 'PM', last_name: 'User', orgId: orgA.id, role_id: roleMap['PM'] },
        { email: 'dev@raymond.com', roles: 'Developer', first_name: 'Dev', last_name: 'User', orgId: orgA.id, role_id: roleMap['Developer'] },
        { email: 'user@orgb.com', roles: 'Superadmin', first_name: 'OrgB', last_name: 'User', orgId: orgB.id, role_id: roleOrgB.id },
    ];

    for (const u of users) {
        const user = await prisma.users.upsert({
            where: { email_organization_id: { email: u.email, organization_id: u.orgId } },
            update: {
                password: passwordHash,
                role_id: u.role_id,
            },
            create: {
                id: require('crypto').randomUUID(),
                email: u.email,
                password: passwordHash,
                first_name: u.first_name,
                last_name: u.last_name,
                organization_id: u.orgId,
                role_id: u.role_id,
            } as any,
        });
        console.log(`👤 User ${u.email} (${u.roles}) ready.`);
    }

    console.log('✅ Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
