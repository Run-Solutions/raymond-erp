const { PrismaClient } = require('.prisma/client-taller-r1');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking and adding missing columns...');

    try {
        // Check salidas columns
        const salidasCols = await prisma.$queryRaw`SHOW COLUMNS FROM salidas`;
        const salidasColNames = salidasCols.map(c => c.Field);
        console.log('salidas columns:', salidasColNames.join(', '));

        // Check salida_detalle columns
        const detalleCols = await prisma.$queryRaw`SHOW COLUMNS FROM salida_detalle`;
        const detalleColNames = detalleCols.map(c => c.Field);
        console.log('salida_detalle columns:', detalleColNames.join(', '));

        // Add destino to salidas if missing
        if (!salidasColNames.includes('destino')) {
            console.log('Adding destino to salidas...');
            await prisma.$executeRaw`ALTER TABLE salidas ADD COLUMN destino VARCHAR(100)`;
            console.log('✓ destino added to salidas');
        } else {
            console.log('✓ destino already exists in salidas');
        }

        // Add checklist_entrega to salida_detalle if missing
        if (!detalleColNames.includes('checklist_entrega')) {
            console.log('Adding checklist_entrega to salida_detalle...');
            await prisma.$executeRaw`ALTER TABLE salida_detalle ADD COLUMN checklist_entrega JSON`;
            console.log('✓ checklist_entrega added to salida_detalle');
        } else {
            console.log('✓ checklist_entrega already exists in salida_detalle');
        }

        // Fix id_equipo_ubicacion length
        const idEquipoUbicacionCol = detalleCols.find(c => c.Field === 'id_equipo_ubicacion');
        if (idEquipoUbicacionCol) {
            console.log('id_equipo_ubicacion type:', idEquipoUbicacionCol.Type);
            if (idEquipoUbicacionCol.Type === 'varchar(20)') {
                console.log('Expanding id_equipo_ubicacion to VARCHAR(50)...');
                await prisma.$executeRaw`ALTER TABLE salida_detalle MODIFY COLUMN id_equipo_ubicacion VARCHAR(50)`;
                console.log('✓ id_equipo_ubicacion expanded to VARCHAR(50)');
            } else {
                console.log('✓ id_equipo_ubicacion is already large enough:', idEquipoUbicacionCol.Type);
            }
        }

        console.log('Done!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
