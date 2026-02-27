const { PrismaClient } = require('./apps/node_modules/.prisma/client-taller-r1');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Entry E-209 ---');
    const entrada = await prisma.entradas.findFirst({
        where: { folio: 'E-209' },
    });

    if (!entrada) {
        console.log('Entry E-209 NOT found by folio!');
        return;
    }

    console.log('Entry E-209 base data:', JSON.stringify(entrada, null, 2));

    console.log('\n--- Checking Client record ---');
    if (entrada.cliente) {
        const client = await prisma.cliente.findUnique({
            where: { id_cliente: entrada.cliente }
        });
        console.log(`Searching for client ID [${entrada.cliente}]:`, client ? 'FOUND: ' + client.nombre_cliente : 'NOT FOUND');
    }

    console.log('\n--- Checking Item Counts ---');
    const detailsCount = await prisma.entrada_detalle.count({
        where: { id_entrada: entrada.id_entrada }
    });
    const accCount = await prisma.entrada_accesorios.count({
        where: { id_entrada: entrada.id_entrada }
    });

    console.log(`Manual Detail Count: ${detailsCount}`);
    console.log(`Manual Accessory Count: ${accCount}`);

    console.log('\n--- Checking Full Join Query ---');
    const fullEntrada = await prisma.entradas.findFirst({
        where: { folio: 'E-209' },
        include: {
            rel_cliente: { select: { nombre_cliente: true } },
            _count: {
                select: {
                    entrada_detalle: true,
                    entrada_accesorios: true
                }
            }
        }
    });
    console.log('Full Query Result:', JSON.stringify(fullEntrada, null, 2));

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
