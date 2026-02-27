import { PrismaClient } from '.prisma/client-taller-r1';

async function main() {
    const prisma = new PrismaClient();
    try {
        // Find orphaned rows
        const orphaned = await prisma.$queryRaw`
            SELECT id_evaluacion, id_detalle 
            FROM evaluaciones_checklist 
            WHERE id_detalle NOT IN (SELECT id_detalles FROM entrada_detalle)
        `;
        console.log('Orphaned rows:', orphaned);

        // Delete them
        const result = await prisma.$executeRaw`
            DELETE FROM evaluaciones_checklist 
            WHERE id_detalle NOT IN (SELECT id_detalles FROM entrada_detalle)
        `;
        console.log('Deleted rows:', result);
    } catch (e) {
        console.error("Error is:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
