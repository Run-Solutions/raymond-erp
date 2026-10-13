// Helpers puros compartidos por el dashboard de presupuestos y el histórico.
// Viven aquí para evitar ciclos de importación entre presupuestos.service e historial.service.
import dayjs from 'dayjs';

export function periodoActual(): string {
    return dayjs().format('YYYY-MM');
}

export function stripAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function cleanAdcName(name: string | null | undefined): string {
    if (!name) return '';
    return stripAccents(name)
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isSameAdc(adcCandidate: string | null | undefined, targetAdc: string): boolean {
    const c = cleanAdcName(adcCandidate);
    const t = cleanAdcName(targetAdc);
    if (!c || !t) return false;

    // 1. Exact normalized match
    if (c === t) return true;

    // 2. Token based match: all significant words (>2 chars)
    const cTokens = c.split(' ').filter(w => w.length > 2);
    const tTokens = t.split(' ').filter(w => w.length > 2);

    if (cTokens.length === 0 || tTokens.length === 0) return false;

    const allTargetInCandidate = tTokens.every(token => cTokens.includes(token));
    const allCandidateInTarget = cTokens.every(token => tTokens.includes(token));

    if (allTargetInCandidate || allCandidateInTarget) return true;

    if (tTokens.length === 1 && cTokens.includes(tTokens[0]) && tTokens[0].length >= 4) {
        return true;
    }
    if (cTokens.length === 1 && tTokens.includes(cTokens[0]) && cTokens[0].length >= 4) {
        return true;
    }

    return false;
}

export function getEffectiveAdc(r: any): string {
    if (!r) return 'Sin ADC';
    const raw = r.adc || r.activo?.adc || r.sitio?.adc || r.cliente?.adc || (r.cliente as any)?.datos_comerciales?.adc;
    return raw?.trim() || 'Sin ADC';
}

export function getEffectiveOrderAdc(o: any): string {
    if (!o) return 'Sin ADC';
    const raw = o.renta?.adc || o.activo?.adc || o.renta?.activo?.adc || o.renta?.sitio?.adc || o.cliente?.adc || (o.cliente as any)?.datos_comerciales?.adc;
    return raw?.trim() || 'Sin ADC';
}

export function matchAdcKeywords(entity: any, keywords: string[]): boolean {
    if (!keywords || keywords.length === 0) return true;
    const effective = typeof entity === 'string'
        ? entity
        : (entity && (entity.renta !== undefined || entity.activo !== undefined && entity.periodo !== undefined)
            ? getEffectiveOrderAdc(entity)
            : getEffectiveAdc(entity));
    return keywords.some(kw => isSameAdc(effective, kw));
}

export function isBackupOrInactive(r: {
    estado?: string | null;
    activo?: { estatus?: string | null; estatus_operativo?: string | null; situacion?: string | null } | null;
    condiciones?: any;
    detalles?: { moneda?: string | null } | null;
}): boolean {
    if (!r) return true;

    // Si la moneda es "NA", no es una renta monetaria presupuestable
    const moneda = (r.detalles?.moneda || '').toUpperCase().trim();
    if (moneda === 'NA' || moneda === 'N/A') return true;

    const estadoRenta = (r.estado || '').toUpperCase().trim();
    if (
        estadoRenta.includes('INACTIV') ||
        estadoRenta.includes('BACK') ||
        estadoRenta.includes('COMODATO') ||
        estadoRenta.includes('BAJA') ||
        estadoRenta.includes('CANCELAD') ||
        estadoRenta.includes('TALLER')
    ) {
        return true;
    }

    const estatusActivo = (r.activo?.estatus || '').toUpperCase().trim();
    const estatusOp = (r.activo?.estatus_operativo || '').toUpperCase().trim();
    const situacion = (r.activo?.situacion || '').toUpperCase().trim();

    for (const st of [estatusActivo, estatusOp, situacion]) {
        if (!st) continue;
        if (
            st.includes('INACTIV') ||
            st.includes('BACK') ||
            st.includes('COMODATO') ||
            st.includes('BAJA') ||
            st.includes('TALLER') ||
            st.includes('POR RETIRAR') ||
            st.includes('RETIRAD')
        ) {
            return true;
        }
    }

    const cond = (r.condiciones as any) || {};
    const condStr = JSON.stringify(cond).toUpperCase();
    if (
        condStr.includes('"ES_BACKUP":TRUE') ||
        condStr.includes('"TIPO":"BACKUP"') ||
        condStr.includes('"ESTATUS":"BACK UP"') ||
        condStr.includes('"ESTATUS":"BACKUP"')
    ) {
        return true;
    }

    return false;
}

export function isEquipoActivo(estatus?: string | null, estatus_operativo?: string | null): boolean {
    // Lista BLANCA: solo presupuestan equipos en estatus Activo
    // (misma normalización que flotilla: ACTIVO/VIGENTE/OPERATIVO/DISPONIBLE → Activo)
    const norm = (s?: string | null) => (s || '').trim().toUpperCase();
    const vals = [norm(estatus), norm(estatus_operativo)].filter(Boolean);
    if (vals.length === 0) return false;
    return vals.some(v =>
        v === 'ACTIVO' || v === 'ACTIVA' || v === 'VIGENTE' || v === 'OPERATIVO' || v === 'DISPONIBLE'
    );
}

export function isRentaActivaVigente(r: {
    estado?: string | null;
    activo?: { estatus?: string | null; estatus_operativo?: string | null; situacion?: string | null } | null;
    condiciones?: any;
    detalles?: { moneda?: string | null } | null;
}): boolean {
    if (isBackupOrInactive(r)) return false;
    // Solo equipos en estatus Activo (excluye Por entregar, Inactivos, Back Up, etc.)
    if (!isEquipoActivo(r.activo?.estatus, r.activo?.estatus_operativo)) return false;
    const estadoRenta = (r.estado || '').toUpperCase().trim();
    return estadoRenta === 'VIGENTE' || estadoRenta === 'IMPORTADA' || estadoRenta === 'ACTIVA' || estadoRenta === 'ACTIVO' || estadoRenta === 'RENOVADA';
}

export function hasValidPO(po: string | null | undefined): boolean {
    if (!po) return false;
    const clean = String(po).trim().toUpperCase();
    return clean !== '' && clean !== '-' && !['PENDIENTE', 'NULL', 'UNDEFINED', 'SIN OC', 'SIN PO', 'N/A', 'NA'].includes(clean);
}

export function hasValidTotvs(totvs: string | null | undefined): boolean {
    if (!totvs) return false;
    const clean = String(totvs).trim().toUpperCase();
    return clean !== '' && clean !== '-' && !['PENDIENTE', 'NA', 'N/A', 'NO', 'NULL', 'UNDEFINED', 'SIN TOTVS', 'INVALID DATE'].includes(clean);
}

export function isPedidoEnviado(o: any): boolean {
    if (!o) return false;
    // Ignorar órdenes asociadas a equipos en Back Up o Inactivos
    if (o.renta && isBackupOrInactive(o.renta)) return false;
    // Solo equipos en estatus Activo (lista blanca; cubre Back Up, Inactivos y Por entregar)
    const effActivo = (o as any).activo || (o as any).renta?.activo;
    if (effActivo && !isEquipoActivo(effActivo.estatus, effActivo.estatus_operativo)) return false;
    if (o.estado === 'FACTURADA') return true;
    const hasPo = hasValidPO(o.po);
    const cond = (o.condiciones as any) || {};
    const rawTotvs = cond.pedido_totvs || cond.pedido || cond.pedido_tovts;
    const hasTotvs = hasValidTotvs(rawTotvs);
    // Para considerarse "Pedido Enviado" debe tener OC válida y No. Registro TOTVS asignado/emitido
    return hasPo && hasTotvs;
}

/**
 * Contribución de una renta al presupuesto mensual.
 * Misma regla que el dashboard: renta vigente con equipo Activo,
 * monto = renta_real || renta_base || tarifa. Detenidos => 0.
 */
export function contribucionPresupuesto(renta: any): number {
    if (!renta || !isRentaActivaVigente(renta)) return 0;
    const estatusNorm = (renta.activo?.estatus || renta.activo?.estatus_operativo || '').trim().toUpperCase();
    if (estatusNorm.includes('DETENIDO')) return 0;
    return Number(renta.detalles?.renta_real || renta.detalles?.renta_base || renta.tarifa || 0);
}
