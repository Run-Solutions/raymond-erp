import { PrismaClient } from '@prisma/client-taller-r1';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Diagnóstico de Renovados ---');
    const solicitudes = await prisma.renovado_solicitud.findMany({
        include: {
            _count: {
                select: { fases: true, refacciones: true, incidencias: true }
            }
        }
    });

    console.log(`Total solicitudes: ${solicitudes.length}`);
    solicitudes.forEach(s => {
        console.log(`ID: ${s.id_solicitud} | Serial: ${s.serial_equipo} | Estado: ${s.estado}`);
        console.log(`  - Fases: ${s._count.fases}`);
        console.log(`  - Refacciones: ${s._count.refacciones}`);
        console.log(`  - Incidencias: ${s._count.incidencias}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
