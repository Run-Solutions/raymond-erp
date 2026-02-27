import { PrismaClient } from '.prisma/client-taller-r1';

async function main() {
    const prisma = new PrismaClient();
    try {
        const result = await prisma.entrada_accesorios.findMany({
            where: { id_entrada: '01a4aeef' }
        });
        console.log("Success:", result);
    } catch (e) {
        console.error("Error is:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
