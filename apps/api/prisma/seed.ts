import { PrismaClient, ProjectStatus, TaskStatus, TaskPriority, AccountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedEnterpriseRoles } from './seeds/enterprise-roles.seed';
import { seedEnterprisePermissions } from './seeds/enterprise-permissions.seed';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding RAYMOND ERP database...\n');

    // 1. Create Organization
    console.log('📦 Creating organization...');
    const org = await prisma.organizations.upsert({
        where: { slug: 'acme-corp' },
        update: {},
        create: {
            id: require('crypto').randomUUID(),
            name: 'Acme Corporation',
            slug: 'acme-corp',
            is_active: true,
            updated_at: new Date(),
        } as any,
    });
    console.log(`✓ Organization: ${org.name}\n`);

    // 2. Create Enterprise Roles
    console.log('👥 Creating enterprise roles...');
    const roles = await seedEnterpriseRoles(prisma, org.id);
    const roleMap = new Map(roles.map(r => [r.name, r]));
    console.log(`✓ Created/Updated ${roles.length} roles\n`);

    // 3. Create Permissions and Assign to Roles
    console.log('🔐 Creating and assigning permissions...');
    await seedEnterprisePermissions(prisma, org.id);
    console.log(`✓ Permissions assigned\n`);

    // 4. Create Users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('Raymond2025!', 10); // Stronger default password

    const usersToCreate = [
        {
            email: 'j.molina@raymond.com',
            first_name: 'Julian',
            last_name: 'Molina',
            roles: 'Superadmin',
        },
        {
            email: 'ceo@raymond.com',
            first_name: 'Carlos',
            last_name: 'CEO',
            roles: 'CEO',
        },
        {
            email: 'cfo@raymond.com',
            first_name: 'Fernanda',
            last_name: 'CFO',
            roles: 'CFO',
        },
        {
            email: 'contador.senior@raymond.com',
            first_name: 'Sergio',
            last_name: 'Contador',
            roles: 'Contador Senior',
        },
        {
            email: 'gerente.ops@raymond.com',
            first_name: 'Gustavo',
            last_name: 'Operaciones',
            roles: 'Gerente Operaciones',
        },
        {
            email: 'supervisor@raymond.com',
            first_name: 'Sandra',
            last_name: 'Supervisor',
            roles: 'Supervisor',
        },
        {
            email: 'pm@raymond.com',
            first_name: 'Pablo',
            last_name: 'Manager',
            roles: 'Project Manager',
        },
        {
            email: 'dev@raymond.com',
            first_name: 'David',
            last_name: 'Developer',
            roles: 'Developer',
        },
        {
            email: 'operario@raymond.com',
            first_name: 'Oscar',
            last_name: 'Operario',
            roles: 'Operario',
        },
    ];

    for (const userData of usersToCreate) {
        const role = roleMap.get(userData.roles);
        if (!role) {
            console.warn(`⚠️ Role ${userData.roles} not found for user ${userData.email}`);
            continue;
        }

        await prisma.users.upsert({
            where: {
                email_organization_id: {
                    email: userData.email,
                    organization_id: org.id,
                },
            },
            update: {
                password: hashedPassword,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role_id: role.id,
                is_active: true,
            },
            create: {
                id: require('crypto').randomUUID(),
                email: userData.email,
                password: hashedPassword,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role_id: role.id,
                organization_id: org.id,
                is_active: true,
                updated_at: new Date(),
            } as any,
        });
        console.log(`✓ User: ${userData.email} (${userData.roles})`);
    }
    console.log('');

    // 5. Create Chart of Accounts
    console.log('💰 Creating chart of accounts...');
    const accounts = [
        { name: 'Cash', code: '1001', type: AccountType.ASSET },
        { name: 'Bank - Checking', code: '1002', type: AccountType.ASSET },
        { name: 'Accounts Receivable', code: '1010', type: AccountType.ASSET },
        { name: 'Equipment', code: '1101', type: AccountType.ASSET },
        { name: 'Accounts Payable', code: '2001', type: AccountType.LIABILITY },
        { name: 'Long-term Loans', code: '2101', type: AccountType.LIABILITY },
        { name: "Owner's Capital", code: '3001', type: AccountType.EQUITY },
        { name: 'Retained Earnings', code: '3002', type: AccountType.EQUITY },
        { name: 'Service Revenue', code: '4001', type: AccountType.REVENUE },
        { name: 'Sales Revenue', code: '4002', type: AccountType.REVENUE },
        { name: 'Salaries & Wages', code: '5010', type: AccountType.EXPENSE },
        { name: 'Rent Expense', code: '5020', type: AccountType.EXPENSE },
        { name: 'Utilities', code: '5030', type: AccountType.EXPENSE },
    ];

    const accountMap = new Map();
    for (const acc of accounts) {
        const account = await prisma.accounts.upsert({
            where: {
                code_organization_id: {
                    code: acc.code,
                    organization_id: org.id,
                },
            },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                ...acc,
                organization_id: org.id,
                updated_at: new Date(),
            } as any,
        });
        accountMap.set(acc.code, account.id);
    }
    console.log(`✓ Created ${accounts.length} accounts\n`);

    // 6. Create Sample Projects
    console.log('📊 Creating sample projects...');
    const pmRole = roleMap.get('Project Manager');
    const pmUser = await prisma.users.findFirst({ where: { role_id: pmRole?.id } });

    if (pmUser) {
    const project1 = await prisma.projects.create({
        data: {
            id: require('crypto').randomUUID(),
            name: 'RAYMOND ERP Platform',
            description: 'Building the core ERP system',
            status: ProjectStatus.ACTIVE,
            start_date: new Date('2025-01-01'),
            owner_id: pmUser.id,
            organization_id: org.id,
            updated_at: new Date(),
        } as any,
    });

        const project2 = await prisma.projects.create({
            data: {
                id: require('crypto').randomUUID(),
                name: 'Mobile App Development',
                description: 'React Native mobile application',
                status: ProjectStatus.PLANNING,
                start_date: new Date('2025-02-01'),
                owner_id: pmUser.id,
                organization_id: org.id,
                updated_at: new Date(),
            } as any,
        });
        console.log(`✓ Projects: ${project1.name}, ${project2.name}\n`);

        // 7. Create Sprints
        console.log('🏃 Creating sprints...');
        const sprint1 = await prisma.sprints.create({
            data: {
                id: require('crypto').randomUUID(),
                name: 'Sprint 1 - Core Features',
                project_id: project1.id,
                start_date: new Date('2025-01-01'),
                end_date: new Date('2025-01-14'),
                goal: 'Implement authentication and basic CRUD',
                organization_id: org.id,
            } as any,
        });

        const sprint2 = await prisma.sprints.create({
            data: {
                id: require('crypto').randomUUID(),
                name: 'Sprint 2 - Finance Module',
                project_id: project1.id,
                start_date: new Date('2025-01-15'),
                end_date: new Date('2025-01-28'),
                goal: 'Complete double-entry accounting',
                organization_id: org.id,
            } as any,
        });
        console.log(`✓ Sprints created\n`);

        // 8. Create Tasks
        console.log('✅ Creating tasks...');
        const devRole = roleMap.get('Developer');
        const devUser = await prisma.users.findFirst({ where: { role_id: devRole?.id } });

        if (devUser) {
            const tasks = [
                {
                    title: 'Implement user authentication',
                    description: 'JWT-based auth with refresh tokens',
                    status: TaskStatus.DONE,
                    priority: TaskPriority.HIGH,
                    project_id: project1.id,
                    sprint_id: sprint1.id,
                    assignee_id: devUser.id,
                    reporter_id: pmUser.id,
                    estimated_hours: 16,
                    actual_hours: 14,
                    position: 0,
                },
                {
                    title: 'Create Projects module',
                    description: 'Full CRUD for projects',
                    status: TaskStatus.DONE,
                    priority: TaskPriority.HIGH,
                    project_id: project1.id,
                    sprint_id: sprint1.id,
                    assignee_id: devUser.id,
                    reporter_id: pmUser.id,
                    estimated_hours: 12,
                    actual_hours: 10,
                    position: 1,
                },
                {
                    title: 'Build Kanban board',
                    description: 'Drag-and-drop task management',
                    status: TaskStatus.IN_PROGRESS,
                    priority: TaskPriority.MEDIUM,
                    project_id: project1.id,
                    sprint_id: sprint2.id,
                    assignee_id: devUser.id,
                    reporter_id: pmUser.id,
                    estimated_hours: 20,
                    position: 0,
                },
                {
                    title: 'Implement double-entry accounting',
                    description: 'Journal entries with validation',
                    status: TaskStatus.REVIEW,
                    priority: TaskPriority.CRITICAL,
                    project_id: project1.id,
                    sprint_id: sprint2.id,
                    assignee_id: devUser.id,
                    reporter_id: pmUser.id,
                    estimated_hours: 24,
                    actual_hours: 22,
                    position: 1,
                },
                {
                    title: 'Design mobile UI mockups',
                    description: 'Figma designs for mobile app',
                    status: TaskStatus.TODO,
                    priority: TaskPriority.MEDIUM,
                    project_id: project2.id,
                    assignee_id: null,
                    reporter_id: pmUser.id,
                    estimated_hours: 8,
                    position: 0,
                },
            ];

            for (const task of tasks) {
                await prisma.tasks.create({
                    data: {
                        id: require('crypto').randomUUID(),
                        ...task,
                        organization_id: org.id,
                        updated_at: new Date(),
                    } as any,
                });
            }
            console.log(`✓ Created ${tasks.length} tasks\n`);
        }
    }

    // 9. Create Sample Journal Entries
    console.log('📒 Creating journal entries...');
    const entry1 = await prisma.journal_entries.create({
        data: {
            id: require('crypto').randomUUID(),
            description: 'Initial capital investment',
            date: new Date('2025-01-01'),
            reference: 'INIT-001',
            organization_id: org.id,
            updated_at: new Date(),
        } as any,
    });

    await prisma.journal_lines.create({
        data: {
            journal_entry_id: entry1.id,
            id: require('crypto').randomUUID(),
            debit_account_id: accountMap.get('1002'), // Bank
            credit_account_id: accountMap.get('3001'), // Owner's Capital
            amount: 100000,
        },
    });

    const entry2 = await prisma.journal_entries.create({
        data: {
            id: require('crypto').randomUUID(),
            description: 'Client payment for services',
            date: new Date('2025-01-15'),
            reference: 'INV-001',
            organization_id: org.id,
            updated_at: new Date(),
        } as any,
    });

    await prisma.journal_lines.create({
        data: {
            journal_entry_id: entry2.id,
            id: require('crypto').randomUUID(),
            debit_account_id: accountMap.get('1002'), // Bank
            credit_account_id: accountMap.get('4001'), // Service Revenue
            amount: 25000,
        },
    });

    const entry3 = await prisma.journal_entries.create({
        data: {
            id: require('crypto').randomUUID(),
            description: 'Monthly rent payment',
            date: new Date('2025-01-05'),
            reference: 'RENT-JAN',
            organization_id: org.id,
            updated_at: new Date(),
        } as any,
    });

    await prisma.journal_lines.create({
        data: {
            journal_entry_id: entry3.id,
            id: require('crypto').randomUUID(),
            debit_account_id: accountMap.get('5020'), // Rent Expense
            credit_account_id: accountMap.get('1002'), // Bank
            amount: 5000,
        },
    });

    console.log('✓ Created 3 journal entries\n');

    console.log('✨ Database seeding completed successfully!\n');
    console.log('📋 Credentials (Password: Raymond2025!):');
    usersToCreate.forEach(u => {
        console.log(`   - ${u.roles}: ${u.email}`);
    });
    console.log('');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
