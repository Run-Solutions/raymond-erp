import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting deletion of test tasks...');

    const testTasks = await prisma.tasks.findMany({
        where: {
            OR: [
                { title: { contains: 'test', mode: 'insensitive' } },
                { title: { contains: 'prueba', mode: 'insensitive' } },
            ],
        },
    });

    console.log(`Found ${testTasks.length} test tasks.`);

    if (testTasks.length > 0) {
        const deleted = await prisma.tasks.deleteMany({
            where: {
                OR: [
                    { title: { contains: 'test', mode: 'insensitive' } },
                    { title: { contains: 'prueba', mode: 'insensitive' } },
                ],
            },
        });
        console.log(`Deleted ${deleted.count} tasks.`);
    } else {
        console.log('No test tasks found.');
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
