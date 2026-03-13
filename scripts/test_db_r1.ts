
import { PrismaClient } from '@prisma/client-taller-r1';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('Connecting to Taller R1 database...');
        await prisma.$connect();
        console.log('Connected successfully!');

        console.log('Checking renovado_solicitud table...');
        const count = await prisma.renovado_solicitud.count();
        console.log(`Table exists! Current count: ${count}`);

        const first = await prisma.renovado_solicitud.findFirst({
            include: {
                fases: true,
                _count: {
                    select: { incidencias: true }
                }
            }
        });
        console.log('Query successful!');
        console.log('First record preview:', JSON.stringify(first, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
