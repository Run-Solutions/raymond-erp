const { PrismaClient } = require('@prisma/client-taller-r1');

async function check() {
    const prisma = new PrismaClient();
    try {
        const serial = '750-18-AC69697';
        console.log(`Buscando ALL records para equipo: ${serial}`);
        
        const equipos = await prisma.equipo_ubicacion.findMany({
            where: { serial_equipo: serial },
            orderBy: { id_equipo_ubicacion: 'desc' }
        });
        
        console.log("ALL equipo_ubicacion:");
        console.dir(equipos, { depth: null });

        const detalles = await prisma.entrada_detalle.findMany({
            where: { serial_equipo: serial }
        });
        console.log("ALL entrada_detalle:");
        console.dir(detalles, { depth: null });
        
        if (detalles.length > 0) {
            const evals = await prisma.evaluaciones_checklist.findMany({
                where: { id_detalle: { in: detalles.map(d => d.id_detalles) } }
            });
            console.log("ALL evaluaciones asociadas:");
            console.dir(evals, { depth: null });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
