import { PrismaClient } from '.prisma/client-taller-r1';
const prisma = new PrismaClient();

async function cleanExcess() {
    console.log('--- Cleaning Excess Empty Sub-Locations ---');
    const ubicaciones = await prisma.ubicacion.findMany();

    let totalDeleted = 0;

    for (const ubi of ubicaciones) {
        const subUbicaciones = await prisma.sub_ubicaciones.findMany({
            where: { id_ubicacion: ubi.id_ubicacion }
        });

        if (subUbicaciones.length > ubi.maximo_stock) {
            const excess = subUbicaciones.length - ubi.maximo_stock;
            console.log(`\nLocation "${ubi.nombre_ubicacion}": Needs to remove ${excess} excess sub-locations.`);

            // Prioritize deleting ones that are not occupied
            const emptySubs = subUbicaciones.filter((s: any) => !s.ubicacion_ocupada);

            if (emptySubs.length === 0) {
                console.log(`  -> Warning: No empty sub-locations available to delete.`);
                continue;
            }

            let deletedCount = 0;
            // Delete the empty sub-locations from highest number first if possible (reverse sort)
            const sortedEmpty = emptySubs.sort((a: any, b: any) => {
                const numA = parseInt(a.nombre) || 0;
                const numB = parseInt(b.nombre) || 0;
                return numB - numA;
            });

            for (const sub of sortedEmpty) {
                if (deletedCount >= excess) break;

                await prisma.sub_ubicaciones.delete({
                    where: { id_sub_ubicacion: sub.id_sub_ubicacion }
                });
                deletedCount++;
                totalDeleted++;
            }
            console.log(`  -> Successfully deleted ${deletedCount} empty sub-locations.`);
        }
    }

    console.log(`\n--- Finished. Total deleted: ${totalDeleted} ---`);
}

cleanExcess()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
