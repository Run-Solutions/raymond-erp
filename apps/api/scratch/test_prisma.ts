import { PrismaClient } from '@prisma/client-taller-r1';

async function test() {
    const prisma = new PrismaClient();
    try {
        console.log('Testing createMany with cuid defaults...');
        // We need a dummy solicitud first
        const sol = await prisma.renovado_solicitud.create({
            data: {
                serial_equipo: 'TEST-SERIAL',
                fecha_target: new Date(),
                meses_fuera: '1-3'
            }
        });
        console.log('Solicitud created:', sol.id_solicitud);

        await prisma.renovado_fase.createMany({
            data: [
                {
                    id_solicitud: sol.id_solicitud,
                    nombre_fase: 'Test Phase',
                    orden: 1,
                    estado: 'Sin iniciar'
                }
            ]
        });
        console.log('createMany success');
    } catch (e) {
        console.error('createMany failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
