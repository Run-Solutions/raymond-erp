import { Controller, Get, Post, Put, Delete, Body, Param, Request, Res, HttpStatus, UseGuards, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { FlotillaService } from './flotilla.service';
import { PrismaDynamicService } from '../../../database/prisma-dynamic.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('r4/flotilla')
export class FlotillaController {
    constructor(private readonly flotillaService: FlotillaService) {}

    private getUserId(req: any): string {
        return req.user?.id || req.user?.sub || req.user?.userId || 'sistema';
    }

    @Get()
    async getFlotilla(@Request() req: any) {
        return {
            success: true,
            data: await this.flotillaService.obtenerFlotilla(req.user)
        };
    }

    @Post()
    async crearActivo(@Body() dto: any, @Request() req: any) {
        const userId = this.getUserId(req);
        return {
            success: true,
            data: await this.flotillaService.crearActivo(dto, userId)
        };
    }

    @Get('solicitudes')
    async getSolicitudes() {
        return {
            success: true,
            data: await this.flotillaService.obtenerSolicitudesPendientes()
        };
    }

    @Post('solicitudes/:id/aprobar')
    async aprobar(@Param('id') id: string, @Request() req: any) {
        const usuarioId = this.getUserId(req);
        return await this.flotillaService.aprobarSolicitud(id, usuarioId);
    }

    @Post('solicitudes/:id/rechazar')
    async rechazar(@Param('id') id: string, @Request() req: any) {
        const usuarioId = this.getUserId(req);
        return await this.flotillaService.rechazarSolicitud(id, usuarioId);
    }

    @Get('exportar/excel')
    async exportarExcel(@Request() req: any, @Res() res: Response) {
        try {
            const workbook = await this.flotillaService.exportarExcel(req.user);
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=Flotilla_${new Date().toISOString().split('T')[0]}.xlsx`,
            );
            await workbook.xlsx.write(res);
            res.end();
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }

    @Get(':id')
    async getCarnet(@Param('id') id: string) {
        return {
            success: true,
            data: await this.flotillaService.obtenerCarnetEquipo(id)
        };
    }

    @Put(':id')
    async actualizarDirecto(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        const db = PrismaDynamicService.clients.r4;
        if (!db) throw new Error('Database client for R4 not initialized');

        // Solo Gerencia/Admin edita datos maestros. Si un ADC intenta el PUT directo,
        // se le omiten Serie, Modelo, Clase y Tipo para que no puedan modificarse.
        const role = req.user?.roles;
        const roleName = (typeof role === 'string' ? role : role?.name || '').toLowerCase();
        const isAdc = roleName !== 'administrador' && roleName !== 'superadmin' && !roleName.includes('geren') && !roleName.includes('coordinaci');
        if (isAdc) {
            delete dto.serie;
            delete dto.modelo;
            delete dto.clase;
            delete dto.tipo;
            delete dto.tipo_equipo;
        }

        const statusLimpio = dto.estatus_operativo ? this.flotillaService.unificarEstatus(dto.estatus_operativo) : undefined;
        
        const activoAnterior = await this.flotillaService.buscarActivoExacto(id);
        if (!activoAnterior) throw new NotFoundException(`Equipo con serie o ID ${id} no encontrado`);
        const targetId = activoAnterior.id;

        let sitioDerived: any = {};
        if (dto.sitio_id) {
            const sitioDestino = await db.sitio.findUnique({ where: { id: dto.sitio_id } }).catch(() => null);
            if (sitioDestino) {
                sitioDerived = {
                    cliente_id: dto.cliente_id !== undefined ? dto.cliente_id : sitioDestino.cliente_id,
                    cuenta: dto.cuenta !== undefined ? dto.cuenta : (sitioDestino.cuenta ?? null),
                    adc: dto.adc !== undefined ? dto.adc : (sitioDestino.adc ?? null),
                    distribuidor: dto.distribuidor !== undefined ? dto.distribuidor : (sitioDestino.distribuidor ?? null),
                };
            }
        }

        const updated = await db.activo.update({
            where: { id: targetId },
            data: {
                ...(dto.clase !== undefined && { clase: dto.clase }),
                ...(dto.modelo !== undefined && { modelo: dto.modelo }),
                ...(dto.serie !== undefined && { serie: dto.serie }),
                ...(dto.tipo !== undefined && { tipo: dto.tipo }),
                ...(dto.tipo_equipo !== undefined && { tipo_equipo: dto.tipo_equipo }),
                ...(dto.cliente_id !== undefined && { cliente_id: dto.cliente_id }),
                ...(dto.cuenta !== undefined && { cuenta: dto.cuenta }),
                ...(dto.propietario !== undefined && { propietario: dto.propietario }),
                ...(dto.oach !== undefined && { oach: dto.oach }),
                ...(dto.altura !== undefined && { altura: dto.altura }),
                ...(dto.bc !== undefined && { bc: dto.bc }),
                ...(dto.marca !== undefined && { marca: dto.marca }),
                ...(dto.capacidad !== undefined && { capacidad: dto.capacidad }),
                ...(dto.capacidad_lb !== undefined && { capacidad_lb: dto.capacidad_lb }),
                ...(dto.adc !== undefined && { adc: dto.adc }),
                ...(dto.distribuidor !== undefined && { distribuidor: dto.distribuidor }),
                ...(dto.sitio_id !== undefined && { sitio_id: dto.sitio_id }),
                ...(statusLimpio && { estatus: statusLimpio, estatus_operativo: statusLimpio }),
                ...sitioDerived,
            }
        });

        // Mantener la renta activa consistente con el sitio/cliente
        if (sitioDerived.cliente_id !== undefined) {
            const rentaActiva = await db.renta.findFirst({
                where: { activo_id: targetId, estado: { in: ['VIGENTE', 'IMPORTADA'] } },
                orderBy: { created_at: 'desc' }
            });
            if (rentaActiva) {
                const mismoCliente = rentaActiva.cliente_id === sitioDerived.cliente_id;
                await db.renta.update({
                    where: { id: rentaActiva.id },
                    data: {
                        cliente_id: sitioDerived.cliente_id,
                        sitio_id: dto.sitio_id,
                        ...(mismoCliente ? { cuenta: sitioDerived.cuenta } : {}),
                        adc: sitioDerived.adc,
                        distribuidor: sitioDerived.distribuidor,
                    }
                });
            }
        }

        // Also check if any rent terms are edited (like tarifa, tipo_poliza etc.)
        if (dto.renta_precio !== undefined || dto.tipo_poliza !== undefined || dto.costo_poliza_distribuidor !== undefined || dto.renta_moneda !== undefined || dto.moneda_pago_distribuidor !== undefined) {
            const rentas = await db.renta.findMany({
                where: { activo_id: targetId }
            });
            if (rentas.length === 0) {
                const precioVal = dto.renta_precio !== undefined ? parseFloat(dto.renta_precio) || 0 : 0;
                const costoVal = dto.costo_poliza_distribuidor !== undefined ? parseFloat(dto.costo_poliza_distribuidor) || 0 : 0;
                const defaultFin = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; })();
                const nuevaRenta = await db.renta.create({
                    data: {
                        activo_id: targetId,
                        cliente_id: activoAnterior.cliente_id ?? dto.cliente_id ?? '',
                        sitio_id: activoAnterior.sitio_id ?? dto.sitio_id ?? '',
                        cuenta: dto.cuenta,
                        adc: dto.adc,
                        distribuidor: dto.distribuidor,
                        tarifa: precioVal,
                        estado: 'VIGENTE',
                        origen: 'MANUAL',
                        fecha_inicio: dto.fecha_efectiva ? new Date(dto.fecha_efectiva) : new Date(),
                        fecha_fin: defaultFin,
                        condiciones: {
                            moneda: dto.renta_moneda || 'MXN',
                            tipo_poliza: dto.tipo_poliza || 'SMP',
                            costo_poliza_distribuidor: costoVal,
                            moneda_pago_distribuidor: dto.moneda_pago_distribuidor || 'MXN'
                        }
                    }
                });
                await db.detallesRenta.create({
                    data: {
                        renta_id: nuevaRenta.id,
                        renta_base: precioVal,
                        renta_real: precioVal,
                        moneda: dto.renta_moneda || 'MXN',
                        descuento_dias_caidos: 0
                    }
                });
            } else {
                for (const renta of rentas) {
                    const condiciones = (renta.condiciones as any) || {};
                    const nuevasCondiciones = {
                        ...condiciones,
                        ...(dto.tipo_poliza !== undefined && { tipo_poliza: dto.tipo_poliza }),
                        ...(dto.costo_poliza_distribuidor !== undefined && { costo_poliza_distribuidor: parseFloat(dto.costo_poliza_distribuidor) || 0 }),
                        ...(dto.moneda_pago_distribuidor !== undefined && { moneda_pago_distribuidor: dto.moneda_pago_distribuidor }),
                    };

                    await db.renta.update({
                        where: { id: renta.id },
                        data: {
                            ...(dto.renta_precio !== undefined && { tarifa: parseFloat(dto.renta_precio) || 0 }),
                            condiciones: nuevasCondiciones
                        }
                    });

                    const detalles = await db.detallesRenta.findUnique({ where: { renta_id: renta.id } });
                    if (detalles) {
                        const nuevoPrecio = dto.renta_precio !== undefined ? parseFloat(dto.renta_precio) || 0 : detalles.renta_base;
                        await db.detallesRenta.update({
                            where: { renta_id: renta.id },
                            data: {
                                ...(dto.renta_precio !== undefined && { renta_base: nuevoPrecio, renta_real: nuevoPrecio - detalles.descuento_dias_caidos }),
                                ...(dto.renta_moneda !== undefined && { moneda: dto.renta_moneda })
                            }
                        });
                    }
                }
            }
        }

        this.flotillaService.invalidarCache();

        const userId = this.getUserId(req);
        const detalleUsuario = await this.flotillaService['obtenerDetalleUsuario'](userId);
        const sitioAnteriorObj = activoAnterior?.sitio_id ? await db.sitio.findUnique({ where: { id: activoAnterior.sitio_id } }) : null;
        const sitioNuevoObj = dto.sitio_id ? await db.sitio.findUnique({ where: { id: dto.sitio_id } }) : sitioAnteriorObj;

        await db.cambioSitioLog.create({
            data: {
                activo_id: targetId,
                sitio_anterior_id: activoAnterior?.sitio_id || null,
                sitio_nuevo_id: dto.sitio_id || activoAnterior?.sitio_id || 'sin_sitio',
                motivo: JSON.stringify({
                    tipo: 'EDICION',
                    accion_nombre: 'Edición de Equipo',
                    solicitante: detalleUsuario,
                    solicitante_id: userId,
                    aprobado_por: detalleUsuario,
                    estado: 'APROBADA',
                    sitio_anterior_nombre: sitioAnteriorObj?.nombre || 'Sin sitio anterior',
                    sitio_nuevo_nombre: sitioNuevoObj?.nombre || 'Sin sitio nuevo',
                    datos: dto
                }),
                aprobado: true,
                usuario_id: userId
            }
        });

        // Si la edición directa trae un modelo nuevo en el catálogo, avisar a Gerencia
        const modeloAnterior = String(activoAnterior?.modelo || '').trim().toLowerCase();
        const modeloNuevo = String((dto as any).modelo || '').trim();
        if (modeloNuevo && modeloNuevo.toLowerCase() !== modeloAnterior) {
            await this.flotillaService.notificarSiModeloNuevo(modeloNuevo, {
                serie: (updated as any).serie || id,
                cliente_id: (dto as any).cliente_id || (activoAnterior as any)?.cliente_id || undefined,
                sitio_id: (dto as any).sitio_id || (activoAnterior as any)?.sitio_id || undefined,
                adc: (dto as any).adc || (updated as any).adc,
                solicitante: detalleUsuario,
            }, targetId);
        }

        return {
            success: true,
            data: updated
        };
    }

    @Put(':id/estatus')
    async actualizarEstatus(
        @Param('id') id: string,
        @Body() body: any,
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        const estatus = typeof body === 'string' ? body : (body?.estatus || body?.estatus_operativo);
        const fechaEfectiva = body?.fecha_efectiva;
        const motivo = body?.motivo || body?.motivo_cambio;
        return {
            success: true,
            data: await this.flotillaService.actualizarEstatus(id, estatus, userId, fechaEfectiva, motivo)
        };
    }

    @Post(':id/solicitar-cambio')
    async solicitarCambio(
        @Param('id') id: string,
        @Body() dto: any,
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        return await this.flotillaService.solicitarCambio(id, dto, userId);
    }

    @Post('solicitar-alta')
    async solicitarAlta(
        @Body() dto: any,
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        return await this.flotillaService.solicitarAlta(dto, userId);
    }

    @Post(':id/solicitar-accesorios')
    async solicitarVinculoAccesorio(
        @Param('id') id: string,
        @Body() dto: { accesorio_id: string, tipo_relacion: string },
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        return await this.flotillaService.solicitarVinculoAccesorio(
            id,
            dto.accesorio_id,
            dto.tipo_relacion,
            userId
        );
    }

    @Post(':id/solicitar-desvincular-accesorios/:accesorioId')
    async solicitarDesvinculoAccesorio(
        @Param('id') id: string,
        @Param('accesorioId') accesorioId: string,
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        return await this.flotillaService.solicitarDesvinculoAccesorio(
            id,
            accesorioId,
            userId
        );
    }

    @Post(':id/accesorios')
    async vincularAccesorio(
        @Param('id') id: string,
        @Body() dto: { accesorio_id: string, tipo_relacion: string, cantidad?: number, notas?: string },
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        return {
            success: true,
            data: await this.flotillaService.vincularAccesorio(
                id,
                dto.accesorio_id,
                dto.tipo_relacion,
                dto.cantidad,
                dto.notas,
                userId
            )
        };
    }

    @Delete(':id/accesorios/:accesorioId')
    async desvincularAccesorio(
        @Param('id') id: string,
        @Param('accesorioId') accesorioId: string,
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        return await this.flotillaService.desvincularAccesorio(id, accesorioId, userId);
    }

    @Delete(':id')
    async eliminarActivo(
        @Param('id') id: string,
        @Request() req: any
    ) {
        const userId = this.getUserId(req);
        return await this.flotillaService.eliminarActivo(id, userId);
    }
}

