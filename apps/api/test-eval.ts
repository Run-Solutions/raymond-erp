import { PrismaTallerR1Service } from './src/database/prisma-taller-r1.service';

const prisma = new PrismaTallerR1Service();

async function main() {
  console.log('Connecting to database...');
  await prisma.onModuleInit();

  const evalCount = await prisma.evaluaciones_checklist.count();
  console.log('Total evaluaciones_checklist:', evalCount);

  const evals = await prisma.evaluaciones_checklist.findMany({
    take: 3,
    include: { entrada_detalle: true }
  });

  console.log("Sample Evaluaciones:");
  console.log(JSON.stringify(evals, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.onModuleDestroy();
    process.exit(0);
  });
