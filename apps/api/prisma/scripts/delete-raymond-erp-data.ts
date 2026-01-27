import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting deletion of "RAYMOND ERP Platform" projects...');

    const projects = await prisma.projects.findMany({
        where: {
            name: 'RAYMOND ERP Platform',
        },
    });

    console.log(`Found ${projects.length} projects named "RAYMOND ERP Platform".`);

    if (projects.length > 0) {
        // Delete tasks associated with these projects first (though cascade should handle it, explicit is safer/clearer log)
        const project_ids = projects.map(p => p.id);

        const tasks = await prisma.tasks.deleteMany({
            where: {
                project_id: { in: project_ids }
            }
        });
        console.log(`Deleted ${tasks.count} associated tasks.`);

        const deleted = await prisma.projects.deleteMany({
            where: {
                id: { in: project_ids }
            },
        });
        console.log(`Deleted ${deleted.count} projects.`);
    } else {
        console.log('No projects found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
