import { PrismaClient } from '@prisma/client-comercial';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const findUp = (start: string, names: string[]): string => {
    let dir = path.resolve(start);
    for (;;) {
        for (const n of names) {
            const p = path.join(dir, n);
            if (fs.existsSync(p)) return p;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return '';
};

const envPath = findUp(__dirname, ['.env', '../../.env', '../../../.env']);
dotenv.config({ path: envPath || undefined });

const normalizeADCName = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const cleanName = name.trim();
    const upperName = cleanName.toUpperCase();
    if (upperName === 'ALEJANDRA') return 'Alejandra Arellanes';
    if (upperName === 'ANDREA') return 'Andrea Esquivel';
    if (upperName === 'DANIEL') return 'Daniel Romero';
    if (upperName === 'MONTSERRAT') return 'Montserrat Covarrubias';
    if (upperName === 'SIMALÚ' || upperName === 'SIMALU') return 'Simalú León';
    return cleanName;
};

const stripAccents = (s: string): string =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const textKey = (v: string | null | undefined): string =>
    stripAccents((v || '').trim())
        .toUpperCase()
        .replace(/["']/g, '')
        .replace(/[^A-Z0-9]/g, '');

const numKey = (v: string | null | undefined): string =>
    stripAccents((v || '').trim())
        .toUpperCase()
        .replace(/["'\s$]/g, '')
        .replace(/,/g, '.')
        .replace(/^N\/A$/, 'NA');

const numValue = (v: string): number | null => {
    const n = parseFloat(v.replace(/"/g, ''));
    return isNaN(n) ? null : n;
};

type FieldKind = 'TEXT' | 'NUM';

interface FieldDef {
    key: string;
    csvCol: string | null;
    kind: FieldKind;
}

const FIELDS: FieldDef[] = [
    { key: 'CLIENTE', csvCol: 'CLIENTE', kind: 'TEXT' },
    { key: 'SITE', csvCol: 'SITE', kind: 'TEXT' },
    { key: 'TIPO', csvCol: 'TIPO', kind: 'TEXT' },
    { key: 'CLASE', csvCol: 'CLASE', kind: 'TEXT' },
    { key: 'MODELO', csvCol: 'MODELO', kind: 'TEXT' },
    { key: 'OACH', csvCol: 'OACH', kind: 'NUM' },
    { key: 'ALTURA', csvCol: 'ALTURA', kind: 'NUM' },
    { key: 'BC', csvCol: 'BC', kind: 'NUM' },
    { key: 'ESTATUS', csvCol: 'ESTATUS', kind: 'TEXT' },
    { key: 'PROPIETARIO', csvCol: 'PROPIETARIO', kind: 'TEXT' },
    { key: 'CUENTA', csvCol: 'CUENTA', kind: 'TEXT' },
    { key: 'ADC', csvCol: 'ADC', kind: 'TEXT' },
    { key: 'DISTRIBUIDOR', csvCol: 'DISTRIBUIDOR', kind: 'TEXT' },
    { key: 'IWAREHOUSE S/N', csvCol: 'IWAREHOUSE S/N', kind: 'TEXT' },
];

const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n') {
            if (field.endsWith('\r')) field = field.slice(0, -1);
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += ch;
        }
    }
    if (field !== '' || row.length) {
        if (field.endsWith('\r')) field = field.slice(0, -1);
        row.push(field);
        rows.push(row);
    }
    return rows;
};

const csvEscape = (v: any): string => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const pad = (s: string, n: number): string => (s + ' '.repeat(n)).slice(0, n);

async function main() {
    const db = new PrismaClient({
        datasources: { db: { url: process.env.COMERCIAL_R4_DATABASE_URL } },
    });

    const csvPath = findUp(__dirname, ['datos maestros viejos.csv']);
    if (!csvPath) {
        console.error('No se encontró el archivo "datos maestros viejos.csv" buscando hacia arriba desde', __dirname);
        process.exit(1);
    }
    const repoRoot = path.dirname(csvPath);
    const raw = fs.readFileSync(csvPath, 'utf8');
    let csvText = raw;
    if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1);
    const parsed = parseCsv(csvText);
    const header = (parsed[0] || []).map((h) => h.trim().toUpperCase().replace(/\s+/g, ' '));
    const colIdx: Record<string, number> = {};
    header.forEach((h, i) => {
        if (h && colIdx[h] === undefined) colIdx[h] = i;
    });
    const csvRows = parsed.slice(1).filter((r) => r.some((c) => c.trim() !== ''));

    const get = (row: string[], col: string): string =>
        colIdx[col] !== undefined ? (row[colIdx[col]] ?? '').trim() : '';

    console.log('Leyendo BD Comercial R4...');
    const [activos, clientes, sitios] = await Promise.all([
        db.activo.findMany(),
        db.cliente.findMany({ select: { id: true, razon_social: true, codigo_cliente: true } }),
        db.sitio.findMany(),
    ]);
    await db.$disconnect();

    const clienteById = new Map(clientes.map((c: any) => [c.id, c]));
    const sitioById = new Map(sitios.map((s: any) => [s.id, s]));
    const activoBySerie = new Map(activos.map((a: any) => [String(a.serie).trim().toUpperCase(), a]));

    interface RowResult {
        serie: string;
        estado: string;
        diffs: string[];
        formatOnly: string[];
        csv: Record<string, string>;
        bd: Record<string, string>;
        dbActivo?: any;
    }

    const results: RowResult[] = [];
    const counts: Record<string, number> = {};
    const marca = (key: string) => { counts[key] = (counts[key] || 0) + 1; };

    const seenSeries = new Map<string, number>();
    let sinSerie = 0;

    const compareField = (def: FieldDef, csvVal: string, dbVal: string): 'EQ' | 'DIFF' | 'FORMAT' => {
        const csvRaw = normalizeADCName(csvVal) || '';
        const dbRaw = dbVal ?? '';
        if (csvRaw.trim() === dbRaw.trim()) return 'EQ';
        if (def.kind === 'NUM') {
            const csvK = numKey(csvRaw);
            const dbK = numKey(dbRaw);
            if (csvK === dbK) return 'EQ';
            const cNum = numValue(csvK);
            const dNum = numValue(dbK);
            if (cNum !== null && dNum !== null && cNum === dNum) return 'FORMAT';
            return 'DIFF';
        }
        if (textKey(csvRaw) === textKey(dbRaw)) return 'EQ';
        return 'DIFF';
    };

    for (const row of csvRows) {
        const serieRaw = get(row, 'SERIE');
        if (!serieRaw) {
            sinSerie++;
            results.push({
                serie: '',
                estado: 'SIN_SERIE',
                diffs: [],
                formatOnly: [],
                csv: {},
                bd: {},
            });
            continue;
        }
        const serieKey = serieRaw.toUpperCase();
        seenSeries.set(serieKey, (seenSeries.get(serieKey) || 0) + 1);

        const dbActivo: any = activoBySerie.get(serieKey);
        const res: RowResult = {
            serie: serieRaw,
            estado: 'IGUAL',
            diffs: [],
            formatOnly: [],
            csv: {},
            bd: {},
            dbActivo,
        };

        for (const f of FIELDS) {
            const csvVal = f.csvCol ? get(row, f.csvCol) : '';
            res.csv[f.key] = csvVal;
        }

        if (!dbActivo) {
            res.estado = 'NO_EN_BD';
            marca('NO_EN_BD');
            results.push(res);
            continue;
        }

        const cliente = clienteById.get(dbActivo.cliente_id);
        const sitio = sitioById.get(dbActivo.sitio_id);
        const infoTecnica = dbActivo.info_tecnica || {};

        const dbMap: Record<string, string> = {
            CLIENTE: cliente?.razon_social || '',
            SITE: sitio?.nombre || '',
            TIENDA: sitio?.tienda || '',
            'CLIENTE TOTVS': sitio?.no_totvs || '',
            TIPO: dbActivo.tipo || '',
            CLASE: dbActivo.clase || '',
            MODELO: dbActivo.modelo || '',
            OACH: dbActivo.oach || '',
            ALTURA: dbActivo.altura || '',
            BC: dbActivo.bc || '',
            ESTATUS: dbActivo.estatus || '',
            PROPIETARIO: dbActivo.propietario || '',
            CUENTA: dbActivo.cuenta || '',
            ADC: dbActivo.adc || '',
            DISTRIBUIDOR: dbActivo.distribuidor || '',
            'IWAREHOUSE S/N': infoTecnica?.iwarehouse || '',
        };

        for (const f of FIELDS) {
            res.bd[f.key] = dbMap[f.key] || '';
        }

        for (const f of FIELDS) {
            const status = compareField(f, res.csv[f.key], res.bd[f.key]);
            if (status === 'DIFF') res.diffs.push(f.key);
            else if (status === 'FORMAT') res.formatOnly.push(f.key);
        }

        if (res.diffs.length) {
            res.estado = 'DIFERENCIA';
            marca('DIFERENCIA');
            res.diffs.forEach((d) => marca(`DIFF_${d}`));
            res.formatOnly.forEach((d) => marca(`FORMAT_${d}`));
        } else if (res.formatOnly.length) {
            res.estado = 'SOLO_FORMATO';
            marca('SOLO_FORMATO');
            res.formatOnly.forEach((d) => marca(`FORMAT_${d}`));
        } else {
            marca('IGUAL');
        }
        results.push(res);
    }

    const csvSeries = new Set(csvRows.map((r) => get(r, 'SERIE').toUpperCase()).filter(Boolean));
    let soloBd = 0;
    for (const a of activos) {
        const serieKey = String(a.serie).trim().toUpperCase();
        if (!serieKey || csvSeries.has(serieKey)) continue;
        const cliente = clienteById.get(a.cliente_id);
        const sitio = sitioById.get(a.sitio_id);
        soloBd++;
        results.push({
            serie: a.serie,
            estado: 'SOLO_BD',
            diffs: [],
            formatOnly: [],
            csv: {},
            bd: {
                CLIENTE: cliente?.razon_social || '',
                SITE: sitio?.nombre || '',
                TIENDA: sitio?.tienda || '',
                'CLIENTE TOTVS': sitio?.no_totvs || '',
                TIPO: a.tipo || '',
                CLASE: a.clase || '',
                MODELO: a.modelo || '',
                OACH: a.oach || '',
                ALTURA: a.altura || '',
                BC: a.bc || '',
                ESTATUS: a.estatus || '',
                PROPIETARIO: a.propietario || '',
                CUENTA: a.cuenta || '',
                ADC: a.adc || '',
                DISTRIBUIDOR: a.distribuidor || '',
                'IWAREHOUSE S/N': (a.info_tecnica || {})?.iwarehouse || '',
            },
        });
        marca('SOLO_BD');
    }

    const dupes = [...seenSeries.entries()].filter(([, n]) => n > 1);

    const headers = ['SERIE', 'ESTADO', 'CAMPOS_DIFERENTES', 'CAMPOS_SOLO_FORMATO'];
    for (const f of FIELDS) {
        headers.push(`${f.key}_CSV`, `${f.key}_BD`);
    }

    const lines: string[] = [headers.map(csvEscape).join(',')];
    const included = results.filter(
        (r) => r.estado !== 'IGUAL' && r.estado !== 'SIN_SERIE'
    );
    for (const r of included) {
        const cols = [
            r.serie,
            r.estado,
            r.diffs.join(' | '),
            r.formatOnly.join(' | '),
        ];
        for (const f of FIELDS) {
            cols.push(r.csv[f.key] || '', r.bd[f.key] || '');
        }
        lines.push(cols.map(csvEscape).join(','));
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const outPath = path.join(repoRoot, `reporte_comparacion_datos_viejos_${dateStr}.csv`);
    fs.writeFileSync(outPath, '\ufeff' + lines.join('\n'), 'utf8');

    console.log('\n==============================================');
    console.log('RESUMEN DE COMPARACIÓN - DATOS MAESTROS VIEJOS vs BD R4');
    console.log('==============================================');
    console.log(`Filas CSV con SERIE          : ${csvRows.length - sinSerie}`);
    console.log(`Series duplicadas en CSV     : ${dupes.length}  (${dupes.slice(0, 5).map(([s, n]) => `${s} x${n}`).join(', ')}${dupes.length > 5 ? '...' : ''})`);
    console.log(`Filas CSV sin SERIE          : ${sinSerie}`);
    console.log(`Activos en BD                : ${activos.length}`);
    console.log(`Emparejados por SERIE        : ${results.length - soloBd - sinSerie}`);
    console.log(`Sin diferencias (IGUAL)      : ${counts.IGUAL || 0}`);
    console.log(`Solo formato                 : ${counts.SOLO_FORMATO || 0}`);
    console.log(`Con diferencias reales       : ${counts.DIFERENCIA || 0}`);
    console.log(`Series del CSV sin BD        : ${counts.NO_EN_BD || 0}`);
    console.log(`Activos en BD sin CSV         : ${soloBd}`);
    console.log('\n--- Diferencias reales por campo ---');
    for (const f of FIELDS) {
        const n = counts[`DIFF_${f.key}`] || 0;
        const fo = counts[`FORMAT_${f.key}`] || 0;
        if (n || fo) console.log(pad(f.key, 22) + `${n} real(es) / ${fo} solo formato`);
    }
    console.log('\n--- Ejemplos (top 6 diferencias reales) ---');
    const diffRows = results.filter((r) => r.estado === 'DIFERENCIA');
    for (const r of diffRows.slice(0, 6)) {
        console.log(`${r.serie}  [${r.diffs.join(', ')}]`);
        for (const f of FIELDS) {
            if (!r.diffs.includes(f.key)) continue;
            console.log(`    ${pad(f.key, 14)} CSV="${r.csv[f.key] || ''}"  BD="${r.bd[f.key] || ''}"`);
        }
    }
    console.log('\n--- Ejemplos (solo formato, top 5) ---');
    for (const r of results.filter((x) => x.estado === 'SOLO_FORMATO').slice(0, 5)) {
        console.log(`${r.serie}  [${r.formatOnly.join(', ')}]`);
        for (const f of FIELDS) {
            if (!r.formatOnly.includes(f.key)) continue;
            console.log(`    ${pad(f.key, 14)} CSV="${r.csv[f.key] || ''}"  BD="${r.bd[f.key] || ''}"`);
        }
    }
    if (soloBd > 0) {
        console.log('\n--- Activos en BD que NO están en el CSV viejo (top 8) ---');
        for (const r of results.filter((x) => x.estado === 'SOLO_BD').slice(0, 8)) {
            console.log(`${r.serie}  ${r.bd.TIPO || ''}  ${r.bd.MODELO || ''}  [${r.bd.CLIENTE || '-'}]  ${r.bd.ESTATUS || ''}`);
        }
        if (soloBd > 8) console.log(`... y ${soloBd - 8} más`);
    }
    console.log(`\nReporte generado: ${outPath}`);
}

main().catch((e) => {
    console.error('ERROR:', e?.message || e);
    process.exit(1);
});