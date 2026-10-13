import { Injectable, Logger } from "@nestjs/common";
import dayjs from "dayjs";
import { PrismaDynamicService } from "../../../database/prisma-dynamic.service";
import {
  isRentaActivaVigente,
  isPedidoEnviado,
  getEffectiveAdc,
  matchAdcKeywords,
  isSameAdc,
  contribucionPresupuesto,
  periodoActual,
} from "./presupuestos.helpers";
import { resolverMonedaOrden } from "../common/moneda.helper";

export type TipoEventoPresupuesto =
  | "ALTA_EQUIPO"
  | "RETIRO_EQUIPO"
  | "CAMBIO_TARIFA"
  | "CAMBIO_ESTATUS"
  | "CAMBIO_MONEDA"
  | "OTRO";

export interface RegistrarEventoInput {
  periodo: string;
  moneda: string;
  tipo_evento: TipoEventoPresupuesto;
  delta: number;
  adc?: string | null;
  cliente?: string | null;
  activo_id?: string | null;
  activo_serie?: string | null;
  renta_id?: string | null;
  origen?: string | null;
  usuario_id?: string | null;
  usuario_nombre?: string | null;
  observaciones?: string | null;
}

export interface HistoricoFilters {
  year: number;
  month: number;
  moneda: string;
  adc?: string;
  cliente_id?: string;
  sitio_id?: string;
}

export interface RentaPresupuestoSnapshot {
  monto: number;
  adc: string;
  cliente: string | null;
  activo_id: string | null;
  activo_serie: string | null;
  moneda: string;
}

@Injectable()
export class PresupuestoHistorialService {
  private readonly logger = new Logger(PresupuestoHistorialService.name);

  constructor(private readonly prismaService: PrismaDynamicService) {}

  private getDb() {
    const db = PrismaDynamicService.clients.r4;
    if (!db) throw new Error("Database client for R4 not initialized");
    return db;
  }

  /**
   * Registra un evento de cambio del presupuesto.
   * Nunca lanza: si las tablas no existen todavía, solo advierte y continúa.
   */
  async registrarEvento(input: RegistrarEventoInput): Promise<void> {
    try {
      const db = this.getDb();
      await db.presupuestoEvento.create({
        data: {
          periodo: input.periodo || periodoActual(),
          moneda: (input.moneda || "MXN").toUpperCase(),
          tipo_evento: input.tipo_evento,
          delta: Number(input.delta) || 0,
          adc: input.adc ?? null,
          cliente: input.cliente ?? null,
          activo_id: input.activo_id ?? null,
          activo_serie: input.activo_serie ?? null,
          renta_id: input.renta_id ?? null,
          origen: input.origen ?? null,
          usuario_id: input.usuario_id ?? null,
          usuario_nombre: input.usuario_nombre ?? null,
          observaciones: input.observaciones ?? null,
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `No se pudo registrar evento de presupuesto (${input.tipo_evento}): ${
          error?.message || error
        }`,
      );
    }
  }

  /**
   * Crea la línea base (INICIAL) del periodo si aún no existe.
   * Idempotente. Nunca lanza.
   */
  async ensureInicial(
    periodo: string,
    moneda: string,
    monto: number,
    detalle: any,
    capturedBy?: { id?: string | null; name?: string | null },
  ): Promise<void> {
    try {
      const db = this.getDb();
      await db.presupuestoSnapshot.upsert({
        where: {
          periodo_moneda_tipo_fecha_ref: {
            periodo,
            moneda: moneda.toUpperCase(),
            tipo: "INICIAL",
            fecha_ref: "",
          },
        },
        update: {},
        create: {
          periodo,
          moneda: moneda.toUpperCase(),
          tipo: "INICIAL",
          fecha_ref: "",
          monto: Number(monto) || 0,
          detalle: detalle ?? undefined,
          captured_by_id: capturedBy?.id ?? null,
          captured_by_name: capturedBy?.name ?? null,
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `No se pudo crear snapshot inicial ${periodo}/${moneda}: ${
          error?.message || error
        }`,
      );
    }
  }

  /**
   * Toma una "foto" presupuestal de una renta: contribución + atributos para la bitácora.
   * Devuelve null si la renta no existe o si no aporta presupuesto. Nunca lanza.
   */
  async snapshotRenta(
    rentaId: string,
  ): Promise<RentaPresupuestoSnapshot | null> {
    try {
      const db = this.getDb();
      const r = await db.renta.findUnique({
        where: { id: rentaId },
        include: { detalles: true, activo: true, cliente: true, sitio: true },
      });
      if (!r) return null;
      return {
        monto: contribucionPresupuesto(r),
        adc: getEffectiveAdc(r),
        cliente: r.cliente?.razon_social || null,
        activo_id: r.activo_id || r.activo?.id || null,
        activo_serie: r.activo?.serie || null,
        moneda: (r.detalles?.moneda || "MXN").toUpperCase(),
      };
    } catch (error: any) {
      this.logger.warn(
        `No se pudo obtener snapshot de renta ${rentaId}: ${
          error?.message || error
        }`,
      );
      return null;
    }
  }

  /**
   * Registra la diferencia presupuestal entre dos fotos de una renta.
   * Si no hay cambio de monto, no registra nada.
   */
  async registrarCambio(
    prev: RentaPresupuestoSnapshot | null,
    next: RentaPresupuestoSnapshot | null,
    tipo_evento: TipoEventoPresupuesto,
    meta?: {
      periodo?: string;
      renta_id?: string | null;
      origen?: string | null;
      usuario_id?: string | null;
      usuario_nombre?: string | null;
      observaciones?: string | null;
    },
  ): Promise<void> {
    const prevMonto = Number(prev?.monto || 0);
    const nextMonto = Number(next?.monto || 0);
    const delta = nextMonto - prevMonto;
    if (delta === 0) return;

    if (!prev && !next) return;

    await this.registrarEvento({
      periodo: meta?.periodo || periodoActual(),
      moneda: next?.moneda || prev?.moneda || "MXN",
      tipo_evento,
      delta,
      adc: next?.adc || prev?.adc || null,
      cliente: next?.cliente || prev?.cliente || null,
      activo_id: next?.activo_id || prev?.activo_id || null,
      activo_serie: next?.activo_serie || prev?.activo_serie || null,
      renta_id: meta?.renta_id || null,
      origen: meta?.origen || "rentas",
      usuario_id: meta?.usuario_id || null,
      usuario_nombre: meta?.usuario_nombre || null,
      observaciones: meta?.observaciones || null,
    });
  }

  private async getSumEventos(
    periodo: string,
    moneda: string,
  ): Promise<number> {
    try {
      const db = this.getDb();
      const res = await db.presupuestoEvento.aggregate({
        where: { periodo, moneda },
        _sum: { delta: true },
      });
      return Number(res?._sum?.delta || 0);
    } catch {
      return 0;
    }
  }

  /**
   * Reconcilia el periodo con el estado real de la BD tras una operación masiva:
   * asegura la línea base y, si hay deriva, registra un evento de ajuste (OTRO)
   * con delta = presupuesto real − (baseline + suma de eventos).
   */
  async reconciliarPeriodo(
    periodo: string,
    user?: { id?: string | null; name?: string | null },
  ): Promise<void> {
    const match = /^(\d{4})-(\d{2})$/.exec(periodo || "");
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]);

    for (const cur of ["MXN", "USD"] as const) {
      try {
        const live = await this.calcularPeriodo({ year, month, moneda: cur });
        // Garantiza baseline antes de calcular la deriva
        await this.ensureInicial(periodo, cur, live.presupuesto, live.detalle);

        const db = this.getDb();
        const base = await db.presupuestoSnapshot.findUnique({
          where: {
            periodo_moneda_tipo_fecha_ref: {
              periodo,
              moneda: cur,
              tipo: "INICIAL",
              fecha_ref: "",
            },
          },
        });
        const baseMonto = Number(base?.monto || 0);
        const sumEv = await this.getSumEventos(periodo, cur);
        const delta =
          Math.round((live.presupuesto - (baseMonto + sumEv)) * 100) / 100;

        if (Math.abs(delta) < 0.5) continue;

        await this.registrarEvento({
          periodo,
          moneda: cur,
          tipo_evento: "OTRO",
          delta,
          origen: "reconciliacion",
          usuario_id: user?.id ?? null,
          usuario_nombre: user?.name ?? null,
          observaciones:
            "Ajuste por operación masiva (reconciliación automática)",
        });
      } catch (error: any) {
        this.logger.warn(
          `No se pudo reconciliar ${periodo}/${cur}: ${
            error?.message || error
          }`,
        );
      }
    }
  }

  /**
   * Reconcilia el desglose por ADC/cliente: compara la línea base + eventos ya
   * registrados contra el presupuesto real en vivo y, si hay deriva, registra un
   * evento (OTRO) con el delta atribuido a esa cuenta. Hace visibles los cambios
   * que no pasaron por una ruta instrumentada (p. ej. altas desde otros módulos
   * o ediciones externas). Nunca lanza.
   */
  async reconciliarDetalle(
    periodo: string,
    moneda: string,
    liveDetalle: Array<{
      adc?: string | null;
      cliente?: string | null;
      monto?: number;
    }>,
  ): Promise<void> {
    try {
      const db = this.getDb();
      const base = await db.presupuestoSnapshot.findUnique({
        where: {
          periodo_moneda_tipo_fecha_ref: {
            periodo,
            moneda,
            tipo: "INICIAL",
            fecha_ref: "",
          },
        },
      });
      if (!base) return;

      const keyOf = (adc?: string | null, cliente?: string | null) =>
        `${adc || "Sin ADC"}___${cliente || "Sin Cliente"}`;

      const sumMap = (
        rows: Array<{
          adc?: string | null;
          cliente?: string | null;
          monto?: number;
          delta?: number;
        }>,
        field: "monto" | "delta",
      ) => {
        const m = new Map<
          string,
          { adc: string; cliente: string; value: number }
        >();
        for (const r of rows || []) {
          const adc = r.adc || "Sin ADC";
          const cliente = r.cliente || "Sin Cliente";
          const key = keyOf(adc, cliente);
          const prev = m.get(key)?.value || 0;
          m.set(key, {
            adc,
            cliente,
            value: prev + Number((r as any)[field] || 0),
          });
        }
        return m;
      };

      const baseMap = sumMap((base.detalle as any[]) || [], "monto");
      const liveMap = sumMap(liveDetalle || [], "monto");

      const evts = await db.presupuestoEvento.findMany({
        where: { periodo, moneda },
        select: { adc: true, cliente: true, delta: true },
      });
      const evMap = sumMap(evts as any[], "delta");

      const keys = new Set<string>([
        ...baseMap.keys(),
        ...liveMap.keys(),
        ...evMap.keys(),
      ]);
      for (const key of keys) {
        const baseMonto = baseMap.get(key)?.value || 0;
        const liveMonto = liveMap.get(key)?.value || 0;
        const evMonto = evMap.get(key)?.value || 0;
        const drift =
          Math.round((liveMonto - (baseMonto + evMonto)) * 100) / 100;
        if (Math.abs(drift) < 0.5) continue;

        const adc =
          liveMap.get(key)?.adc ??
          baseMap.get(key)?.adc ??
          evMap.get(key)?.adc ??
          "Sin ADC";
        const cliente =
          liveMap.get(key)?.cliente ??
          baseMap.get(key)?.cliente ??
          evMap.get(key)?.cliente ??
          "Sin Cliente";
        await this.registrarEvento({
          periodo,
          moneda,
          tipo_evento: "OTRO",
          delta: drift,
          adc: adc === "Sin ADC" ? null : adc,
          cliente: cliente === "Sin Cliente" ? null : cliente,
          origen: "reconciliacion",
          observaciones:
            "Cambio detectado al consultar (alta/retiro/ajuste no registrado en la bitácora)",
        });
      }
    } catch (error: any) {
      this.logger.warn(
        `No se pudo reconciliar detalle ${periodo}/${moneda}: ${
          error?.message || error
        }`,
      );
    }
  }

  /**
   * Calcula el presupuesto y los pedidos enviados de un único periodo+moneda,
   * replicando la lógica del dashboard. Devuelve totales y desglose ADC/cliente.
   */
  private async calcularPeriodo(filters: HistoricoFilters) {
    const db = this.getDb();
    const periodo = `${filters.year}-${String(filters.month).padStart(2, "0")}`;
    const moneda = (filters.moneda || "MXN").toUpperCase();
    const adcKeywords = filters.adc
      ? filters.adc
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const rentasWhere: any = {};
    if (filters.cliente_id) rentasWhere.cliente_id = filters.cliente_id;
    if (filters.sitio_id) rentasWhere.sitio_id = filters.sitio_id;

    const rentas = await db.renta.findMany({
      where: rentasWhere,
      include: { detalles: true, activo: true, cliente: true, sitio: true },
    });

    const ordersWhere: any = { activo_id: { not: null }, periodo };
    if (filters.cliente_id) ordersWhere.cliente_id = filters.cliente_id;

    const orders = await db.ordenMensual.findMany({
      where: ordersWhere,
      include: {
        cliente: true,
        activo: { include: { sitio: true } },
        renta: {
          include: {
            sitio: true,
            activo: { include: { sitio: true } },
            detalles: true,
          },
        },
      },
    });

    let presupuesto = 0;
    const detalleMap = new Map<
      string,
      { adc: string; cliente: string; moneda: string; monto: number }
    >();

    for (const r of rentas) {
      if (adcKeywords.length > 0 && !matchAdcKeywords(r, adcKeywords)) continue;
      const rMoneda = (r.detalles?.moneda || "MXN").toUpperCase();
      if (rMoneda !== moneda) continue;
      const monto = contribucionPresupuesto(r);
      if (monto === 0) continue;
      presupuesto += monto;
      const adcName = getEffectiveAdc(r);
      const clienteName = r.cliente?.razon_social || "Sin Cliente";
      const key = `${adcName}___${clienteName}`;
      if (!detalleMap.has(key)) {
        detalleMap.set(key, {
          adc: adcName,
          cliente: clienteName,
          moneda,
          monto: 0,
        });
      }
      detalleMap.get(key)!.monto += monto;
    }

    let pedidos = 0;
    const pedidosPuntos: Array<{ fecha: string; monto: number }> = [];
    for (const o of orders) {
      if (filters.sitio_id && o.renta?.sitio_id !== filters.sitio_id) continue;
      if (adcKeywords.length > 0 && !matchAdcKeywords(o, adcKeywords)) continue;
      const oMoneda =
        resolverMonedaOrden({
          rentaMoneda: o.renta?.detalles?.moneda,
          ordenMoneda: o.moneda,
        }) || "MXN";
      if (oMoneda !== moneda) continue;
      if (!isPedidoEnviado(o)) continue;

      const rentaTarifa = Number(
        o.renta?.detalles?.renta_real ||
          o.renta?.detalles?.renta_base ||
          o.renta?.tarifa ||
          0,
      );
      const amount =
        o.tarifa && o.tarifa > 0 && o.tarifa <= (rentaTarifa * 3 || 300000)
          ? o.tarifa
          : rentaTarifa || o.tarifa || 0;
      pedidos += amount;

      const cond = (o.condiciones as any) || {};
      const rawFecha =
        cond.fecha_pedido_totvs || cond.fecha_ped || o.created_at;
      const d = rawFecha ? dayjs(rawFecha) : null;
      const fecha = d && d.isValid() ? d.format("YYYY-MM-DD") : null;
      if (fecha) pedidosPuntos.push({ fecha, monto: amount });
    }

    return {
      periodo,
      moneda,
      presupuesto,
      pedidos,
      pedidosPuntos,
      detalle: Array.from(detalleMap.values()).sort(
        (a, b) => b.monto - a.monto,
      ),
    };
  }

  /**
   * Histórico completo de un periodo+moneda: línea base, evolución,
   * eventos, variaciones por ADC/cliente y comparación con pedidos.
   */
  async getHistorico(filters: HistoricoFilters) {
    const db = this.getDb();
    const calc = await this.calcularPeriodo(filters);

    // La línea base persistida es siempre de scope completo (sin filtros de ADC/cliente/sitio)
    // para no contaminarla con vistas parciales. En vistas filtradas se deriva localmente.
    const adcKeywords = filters.adc
      ? filters.adc
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
    const isScoped = !!(filters.adc || filters.cliente_id || filters.sitio_id);

    let baseline: any = null;
    if (!isScoped) {
      // Captura automática del baseline al primer acceso del periodo (scope completo)
      await this.ensureInicial(
        calc.periodo,
        calc.moneda,
        calc.presupuesto,
        calc.detalle,
      );
      // Reconcilia cualquier deriva (cambios no registrados en la bitácora) y la
      // atribuye por ADC/cliente para que siempre se vea de dónde viene la variación.
      await this.reconciliarDetalle(calc.periodo, calc.moneda, calc.detalle);
      try {
        baseline = await db.presupuestoSnapshot.findUnique({
          where: {
            periodo_moneda_tipo_fecha_ref: {
              periodo: calc.periodo,
              moneda: calc.moneda,
              tipo: "INICIAL",
              fecha_ref: "",
            },
          },
        });
      } catch (error: any) {
        this.logger.warn(
          `No se pudo leer snapshot inicial: ${error?.message || error}`,
        );
      }
    }

    let eventos: any[] = [];
    try {
      eventos = await db.presupuestoEvento.findMany({
        where: { periodo: calc.periodo, moneda: calc.moneda },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
      });
    } catch (error: any) {
      this.logger.warn(
        `No se pudo leer eventos de presupuesto: ${error?.message || error}`,
      );
    }
    if (adcKeywords.length > 0) {
      eventos = eventos.filter((ev) =>
        adcKeywords.some((kw) => isSameAdc(ev.adc || "Sin ADC", kw)),
      );
    }

    const sumEventos = eventos.reduce((s, ev) => s + Number(ev.delta || 0), 0);
    const baselineMonto = isScoped
      ? Math.max(0, calc.presupuesto - sumEventos)
      : Number(baseline?.monto || 0);
    const baselineFecha = isScoped
      ? dayjs()
      : baseline?.captured_at
      ? dayjs(baseline.captured_at)
      : dayjs();

    // Serie de evolución: baseline + acumulado de eventos
    const evolucion: Array<{
      fecha: string;
      monto: number;
      delta: number;
      tipo: string;
      descripcion: string;
    }> = [
      {
        fecha: baselineFecha.toISOString(),
        monto: baselineMonto,
        delta: 0,
        tipo: "INICIAL",
        descripcion: "Presupuesto inicial del periodo",
      },
    ];
    let acumulado = baselineMonto;
    for (const ev of eventos) {
      const delta = Number(ev.delta || 0);
      acumulado += delta;
      evolucion.push({
        fecha: dayjs(ev.fecha).toISOString(),
        monto: acumulado,
        delta,
        tipo: ev.tipo_evento,
        descripcion: ev.observaciones || ev.tipo_evento,
      });
    }

    // Variaciones agrupadas por ADC/cliente
    const varMap = new Map<
      string,
      { adc: string; cliente: string; delta: number; eventos: number }
    >();
    for (const ev of eventos) {
      const adc = ev.adc || "Sin ADC";
      const cliente = ev.cliente || "Sin Cliente";
      const key = `${adc}___${cliente}`;
      if (!varMap.has(key))
        varMap.set(key, { adc, cliente, delta: 0, eventos: 0 });
      const item = varMap.get(key)!;
      item.delta += Number(ev.delta || 0);
      item.eventos += 1;
    }
    const variaciones = Array.from(varMap.values()).sort(
      (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
    );

    const presupuestoActual = calc.presupuesto;
    const variacionNeta = presupuestoActual - baselineMonto;
    const variacionEventos = acumulado - baselineMonto;

    return {
      periodo: calc.periodo,
      moneda: calc.moneda,
      baseline: baseline
        ? {
            monto: baselineMonto,
            captured_at: baseline.captured_at,
            captured_by_name: baseline.captured_by_name || null,
            detalle: baseline.detalle || [],
          }
        : {
            monto: baselineMonto,
            captured_at: baselineFecha.toISOString(),
            captured_by_name: null,
            detalle: calc.detalle,
          },
      resumen: {
        inicial: baselineMonto,
        actual: presupuestoActual,
        variacion_neta: variacionNeta,
        variacion_eventos: variacionEventos,
        pedidos_enviados: calc.pedidos,
        variacion_vs_pedidos: presupuestoActual - calc.pedidos,
        cumplimiento:
          presupuestoActual > 0 ? (calc.pedidos / presupuestoActual) * 100 : 0,
        total_eventos: eventos.length,
      },
      evolucion,
      pedidos: calc.pedidosPuntos,
      eventos,
      variaciones,
      detalle_actual: calc.detalle,
    };
  }
}
