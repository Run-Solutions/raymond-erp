import { PrismaClient as PrismaR1 } from '.prisma/client-taller-r1';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    const prisma = new PrismaR1();
    console.log('Ensuring "Evaluación" location exists...');

    console.log('Cleaning up existing "Evaluación" location if exists...');
    const existingEvalZon = await (prisma as any).ubicacion.findFirst({
        where: { nombre_ubicacion: 'EVALUACIÓN' }
    });

    if (existingEvalZon) {
        console.log(`Deleting existing "Evaluación" with ID: ${existingEvalZon.id_ubicacion}`);
        // Delete sub-locations first due to FK
        await (prisma as any).sub_ubicaciones.deleteMany({
            where: { id_ubicacion: existingEvalZon.id_ubicacion }
        });
        await (prisma as any).ubicacion.delete({
            where: { id_ubicacion: existingEvalZon.id_ubicacion }
        });
    }

    console.log('Creating "Evaluación" location with short ID...');
    const evaluacionZon = await (prisma as any).ubicacion.create({
        data: {
            id_ubicacion: 'EVAL-ZONE',
            nombre_ubicacion: 'EVALUACIÓN',
            maximo_stock: 50,
            Clase: 'Todas las clases'
        }
    });

    console.log(`Evaluación ID: ${evaluacionZon.id_ubicacion}`);

    const existingSubs = await (prisma as any).sub_ubicaciones.findMany({
        where: { id_ubicacion: evaluacionZon.id_ubicacion }
    });

    const existingNames = new Set(existingSubs.map((s: any) => s.nombre));

    console.log(`Found ${existingSubs.length} existing sub-locations. Creating missing ones up to 50...`);

    for (let i = 1; i <= 50; i++) {
        const name = `EVAL-${i.toString().padStart(2, '0')}`;
        if (!existingNames.has(name)) {
            await (prisma as any).sub_ubicaciones.create({
                data: {
                    id_sub_ubicacion: uuidv4().substring(0, 10), // Matching VarChar(10) in some tables or VarChar(20)
                    nombre: name,
                    id_ubicacion: evaluacionZon.id_ubicacion,
                    ubicacion_ocupada: false
                }
            });
            console.log(`Created sub-location: ${name}`);
        }
    }

    console.log('Finished setting up Evaluation quadrant.');
}

main().catch(err => {
    console.error('Error in setup script:', err);
    process.exit(1);
});
