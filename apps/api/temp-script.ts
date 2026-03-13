import { PrismaClient } from '@prisma/client-taller-r1';

const prisma = new PrismaClient();

async function main() {
    console.log('Buscando evaluaciones con estado Renovación...');
    const evaluaciones = await prisma.evaluaciones_checklist.findMany({
        where: {
            estado_montacargas: {
                contains: 'Renovaci'
            }
        },
        include: {
            entrada_detalle: true
        }
    });

    console.log(`Encontradas ${evaluaciones.length} evaluaciones.`);

    for (const ev of evaluaciones) {
        if (!ev.entrada_detalle?.serial_equipo) continue;
        
        const serial = ev.entrada_detalle.serial_equipo;

        const active = await prisma.renovado_solicitud.findFirst({
            where: { serial_equipo: serial, estado: 'En Proceso' }
        });

        if (!active) {
            const defaultTarget = new Date();
            // Default a 4 semanas para los viejos que no tengan el campo
            defaultTarget.setDate(defaultTarget.getDate() + (ev.semanas_renovacion ?? 4) * 7);

            console.log(`Creando solicitud de renovado retroactiva para serial: ${serial}`);
            const newR = await prisma.renovado_solicitud.create({
                data: {
                    serial_equipo: serial,
                    fecha_target: defaultTarget,
                    meses_fuera: '1-3'
                }
            });

            const FASES_DEFAULT = [
                'Desmontaje', 'Solicitud refacciones', 'Mantenimiento preventivo',
                'Montaje motores', 'Montaje refacciones', 'Preparación pintura',
                'Pintura', 'Detallado', 'Pruebas funcionales'
            ];

            await prisma.renovado_fase.createMany({
                data: FASES_DEFAULT.map((nombre, index) => ({
                    id_solicitud: newR.id_solicitud,
                    nombre_fase: nombre,
                    orden: index + 1
                }))
            });
        } else {
             console.log(`Soliciutd ya existe para ${serial}`);
        }
    }

    console.log('Proceso terminado.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
