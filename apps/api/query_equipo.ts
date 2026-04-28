import { PrismaClient } from '@prisma/client-taller-r1';

async function main() {
  const prisma = new PrismaClient();
  const equipo = await prisma.equipo_ubicacion.findMany({
    where: {
      serial_equipo: {
        contains: '841-16-31395'
      }
    }
  });
  console.log(equipo);
}
main();
