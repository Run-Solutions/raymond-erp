import { PrismaClient } from './node_modules/.prisma/client-taller-r1';

const prisma = new PrismaClient();

async function main() {
    const d = await prisma.salida_detalle.findMany({ take: 5, orderBy: { id_detalle: 'desc' } });
    console.log(JSON.stringify(d, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
