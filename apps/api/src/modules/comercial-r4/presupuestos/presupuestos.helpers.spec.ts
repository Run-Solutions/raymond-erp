import {
    isEquipoActivo,
    isRentaActivaVigente,
    isPedidoEnviado,
    contribucionPresupuesto,
} from './presupuestos.helpers';

describe('presupuestos.helpers', () => {
    describe('isEquipoActivo', () => {
        it('acepta unicamente ACTIVO exacto (normalizado)', () => {
            expect(isEquipoActivo('Activo')).toBe(true);
            expect(isEquipoActivo(' ACTIVO ')).toBe(true);
        });

        it('rechaza estatus distintos de ACTIVO', () => {
            expect(isEquipoActivo('Por Entregar')).toBe(false);
            expect(isEquipoActivo('Back Up')).toBe(false);
            expect(isEquipoActivo('Inactivo')).toBe(false);
            expect(isEquipoActivo('VIGENTE')).toBe(false);
            expect(isEquipoActivo('OPERATIVO')).toBe(false);
            expect(isEquipoActivo(null)).toBe(false);
            expect(isEquipoActivo(undefined)).toBe(false);
        });
    });

    describe('isRentaActivaVigente', () => {
        const baseRenta = {
            estado: 'VIGENTE',
            condiciones: {},
            detalles: { moneda: 'MXN' },
        };

        it('no considera renta vigente si el estatus es Por Entregar aunque el legacy diga OPERATIVO', () => {
            expect(
                isRentaActivaVigente({
                    ...baseRenta,
                    activo: {
                        estatus: 'Por Entregar',
                        estatus_operativo: 'OPERATIVO',
                    },
                }),
            ).toBe(false);
        });

        it('considera renta vigente solo con estatus ACTIVO', () => {
            expect(
                isRentaActivaVigente({
                    ...baseRenta,
                    activo: {
                        estatus: 'Activo',
                        estatus_operativo: 'OPERATIVO',
                    },
                }),
            ).toBe(true);
        });
    });

    describe('isPedidoEnviado', () => {
        it('no cuenta pedidos de equipos Por Entregar aunque el legacy diga OPERATIVO', () => {
            expect(
                isPedidoEnviado({
                    estado: 'FACTURADA',
                    po: 'OC-123',
                    condiciones: {},
                    renta: {
                        estado: 'VIGENTE',
                        condiciones: {},
                        detalles: { moneda: 'MXN' },
                        activo: {
                            estatus: 'Por Entregar',
                            estatus_operativo: 'OPERATIVO',
                        },
                    },
                }),
            ).toBe(false);
        });

        it('cuenta pedidos facturados de equipos ACTIVO', () => {
            expect(
                isPedidoEnviado({
                    estado: 'FACTURADA',
                    po: 'OC-123',
                    condiciones: {},
                    renta: {
                        estado: 'VIGENTE',
                        condiciones: {},
                        detalles: { moneda: 'MXN' },
                        activo: {
                            estatus: 'Activo',
                            estatus_operativo: 'OPERATIVO',
                        },
                    },
                }),
            ).toBe(true);
        });
    });

    describe('contribucionPresupuesto', () => {
        it('no aporta presupuesto si el estatus es Por Entregar', () => {
            expect(
                contribucionPresupuesto({
                    estado: 'VIGENTE',
                    condiciones: {},
                    detalles: { moneda: 'MXN', renta_real: 100 },
                    activo: {
                        estatus: 'Por Entregar',
                        estatus_operativo: 'OPERATIVO',
                    },
                }),
            ).toBe(0);
        });
    });
});
