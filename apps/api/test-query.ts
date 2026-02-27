import { PrismaTallerR1Service } from './src/database/prisma-taller-r1.service';

const prisma = new PrismaTallerR1Service();
const cleanSerial = 'TEST';

async function main() {
    console.log('Connecting to database...');
    await prisma.onModuleInit();

    try {
        const evals1 = await prisma.evaluaciones_checklist.findMany({
            where: {
                entrada_detalle: {
                    OR: [
                        { serial_equipo: { contains: cleanSerial } },
                        { rel_equipo: { is: { numero_serie: { contains: cleanSerial } } } }
                    ]
                }
            }
        });
        console.log("Success with 'is':", evals1.length);
    } catch (err: any) {
        console.log("Failed with 'is':", err.message);
    }

    try {
        const evals2 = await prisma.evaluaciones_checklist.findMany({
            where: {
                entrada_detalle: {
                    OR: [
                        { serial_equipo: { contains: cleanSerial } },
                        { rel_equipo: { numero_serie: { contains: cleanSerial } } }
                    ]
                }
            }
        });
        console.log("Success with direct:", evals2.length);
    } catch (err: any) {
        console.log("Failed with direct:", err.message);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.onModuleDestroy();
        process.exit(0);
    });
