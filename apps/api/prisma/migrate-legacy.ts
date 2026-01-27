
import { PrismaClient, PaymentStatus, QuoteStatus, RequisitionStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper to parse SQL INSERT statements
function parseInsertValues(sql: string, tableName: string): any[][] {
    const regex = new RegExp(`INSERT INTO \`${tableName}\` VALUES (.*);`, 'g');
    const match = regex.exec(sql);
    if (!match) return [];

    const valuesStr = match[1];
    const rows: any[][] = [];
    let currentRow: any[] = [];
    let currentVal = '';
    let inQuote = false;
    let isEscaped = false;

    // Simple parser for SQL value lists like (1, 'text', NULL), (2, ...)
    for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];

        if (inQuote) {
            if (char === "'" && !isEscaped) {
                inQuote = false;
            } else if (char === '\\' && !isEscaped) {
                isEscaped = true;
            } else {
                isEscaped = false;
                currentVal += char;
            }
        } else {
            if (char === '(' && currentRow.length === 0 && currentVal.trim() === '') {
                // Start of row
                currentRow = [];
            } else if (char === ')' && currentRow.length >= 0) {
                // End of row
                if (currentVal.trim() !== '') {
                    currentRow.push(parseValue(currentVal));
                }
                rows.push(currentRow);
                currentRow = [];
                currentVal = '';
            } else if (char === ',') {
                if (currentRow.length >= 0 && currentVal.trim() !== '') { // Inside a row
                    currentRow.push(parseValue(currentVal));
                    currentVal = '';
                } else if (currentRow.length === 0) {
                    // Comma between rows, ignore
                }
            } else if (char === "'") {
                inQuote = true;
            } else {
                currentVal += char;
            }
        }
    }
    return rows;
}

function parseValue(val: string): any {
    val = val.trim();
    if (val === 'NULL') return null;
    if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
    if (!isNaN(Number(val))) return Number(val);
    return val;
}

// Improved parser that handles the specific structure of the dump better
function extractTableData(sqlContent: string, tableName: string): any[] {
    const insertPrefix = `INSERT INTO \`${tableName}\` VALUES `;
    const startIndex = sqlContent.indexOf(insertPrefix);
    if (startIndex === -1) return [];

    let dataPart = sqlContent.substring(startIndex + insertPrefix.length);
    const endStatementIndex = dataPart.indexOf(';');
    dataPart = dataPart.substring(0, endStatementIndex);

    // Split by "),(" but be careful about quoted strings containing that pattern
    // Since this is a one-off migration script, we can use a slightly more robust regex approach
    // or just split and clean up if we assume standard mysqldump format

    // Regex to match (...) groups
    const rowRegex = /\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/g;
    // This simple regex might fail on nested parenthesis in text, but standard dumps usually escape them.
    // Let's try a manual state machine parser for the whole values string which is safer.

    const rows: any[] = [];
    let currentRow: any[] = [];
    let currentToken = '';
    let inString = false;
    let inParens = 0;

    for (let i = 0; i < dataPart.length; i++) {
        const char = dataPart[i];

        if (inString) {
            if (char === "'" && dataPart[i - 1] !== '\\') {
                inString = false;
            }
            currentToken += char;
        } else {
            if (char === "'") {
                inString = true;
                currentToken += char;
            } else if (char === '(') {
                if (inParens === 0) {
                    // Start of row
                    currentRow = [];
                    currentToken = '';
                } else {
                    currentToken += char;
                }
                inParens++;
            } else if (char === ')') {
                inParens--;
                if (inParens === 0) {
                    // End of row
                    if (currentToken.trim()) {
                        currentRow.push(cleanValue(currentToken));
                    }
                    rows.push(currentRow);
                    currentRow = [];
                    currentToken = '';
                } else {
                    currentToken += char;
                }
            } else if (char === ',') {
                if (inParens === 1) {
                    // Field separator
                    currentRow.push(cleanValue(currentToken));
                    currentToken = '';
                } else {
                    currentToken += char;
                }
            } else {
                currentToken += char;
            }
        }
    }
    return rows;
}

function cleanValue(val: string): any {
    val = val.trim();
    if (val === 'NULL') return null;
    if (val.startsWith("'") && val.endsWith("'")) {
        // Remove quotes and unescape
        val = val.substring(1, val.length - 1);
        val = val.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        return val;
    }
    if (!isNaN(Number(val))) return Number(val);
    return val;
}


async function main() {
    console.log('🚀 Starting Legacy Migration...');

    const sqlPath = path.join(__dirname, '../../../docs/runite_backup.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('❌ SQL dump not found at:', sqlPath);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // 1. Ensure Organization
    console.log('🏢 Setting up Organization...');
    let org = await prisma.organizations.findFirst({ where: { slug: 'runite-legacy' } });
    if (!org) {
        // Try to find default one or create new
        org = await prisma.organizations.findFirst();
        if (!org) {
            org = await prisma.organizations.create({
                data: {
                    id: require('crypto').randomUUID(),
                    name: 'Runite Legacy',
                    slug: 'runite-legacy',
                    updated_at: new Date(),
                } as any
            });
        }
    }
    const orgId = org.id;
    console.log(`✅ Using Organization: ${org.name} (${orgId})`);

    // 2. Users
    console.log('👤 Migrating Users...');
    const usersData = extractTableData(sqlContent, 'users');
    // Structure: id, firebase_uid, email, name, avatar, created_at, updated_at, role
    for (const row of usersData) {
        const [id, firebase_uid, email, name, avatar, created_at, updated_at, roleName] = row;

        // Split name
        const nameParts = (name || '').split(' ');
        const first_name = nameParts[0] || 'Unknown';
        const last_name = nameParts.slice(1).join(' ') || '';

        await prisma.users.upsert({
            where: {
                email_organization_id: {
                    email: email,
                    organization_id: orgId
                }
            },
            update: {
                legacy_user_id: id,
                organization_id: orgId,
            },
            create: {
                id: require('crypto').randomUUID(),
                email: email,
                first_name: first_name,
                last_name: last_name,
                password: 'Runite2025!', // Default password
                organization_id: orgId, // Fixed: Use scalar field directly
                legacy_user_id: id,
                roles: {
                    connectOrCreate: {
                        where: {
                            name_organization_id: {
                                name: roleName || 'Employee',
                                organization_id: orgId
                            }
                        },
                        create: {
                            id: require('crypto').randomUUID(),
                            name: roleName || 'Employee',
                            description: `Legacy roles: ${roleName}`,
                            organization_id: orgId,
                        } as any
                    }
                }
            } as any
        });
    }
    console.log(`✅ Migrated ${usersData.length} Users`);

    // 3. Clients
    console.log('🤝 Migrating Clients...');
    const clientsData = extractTableData(sqlContent, 'clients');
    // Structure: id, run_cliente, nombre, rfc, direccion, created_at, updated_at
    for (const row of clientsData) {
        const [id, run_cliente, nombre, rfc, direccion] = row;

        await prisma.clients.upsert({
            where: { legacy_client_id: id },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                nombre: nombre || 'Unknown Client', // Fixed: name -> nombre
                run_cliente: run_cliente, // Fixed: code -> run_cliente
                rfc: rfc,
                direccion: direccion, // Fixed: address -> direccion
                organization_id: orgId,
                legacy_client_id: id,
            } as any
        });
    }
    console.log(`✅ Migrated ${clientsData.length} Clients`);

    // 4. Suppliers
    console.log('🚚 Migrating Suppliers...');
    const suppliersData = extractTableData(sqlContent, 'proveedores');
    // Structure: id, run_proveedor, nombre, direccion, elemento, datos_bancarios, contacto
    for (const row of suppliersData) {
        const [id, run_proveedor, nombre, direccion, elemento, datos_bancarios, contacto] = row;

        await prisma.suppliers.upsert({
            where: { legacy_supplier_id: id },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                nombre: nombre || 'Unknown Supplier', // Fixed: name -> nombre
                run_proveedor: run_proveedor, // Fixed: code -> run_proveedor
                direccion: direccion, // Fixed: address -> direccion
                contacto: contacto, // Fixed: contactName -> contacto
                datos_bancarios: datos_bancarios, // Fixed: bankDetails -> datos_bancarios
                // category: elemento, // Removed: category not in Supplier model? Check schema.
                organization_id: orgId,
                legacy_supplier_id: id,
            } as any
        });
    }
    console.log(`✅ Migrated ${suppliersData.length} Suppliers`);

    // 5. Phases
    console.log('🔄 Migrating Phases...');
    const phasesData = extractTableData(sqlContent, 'phases');
    // Structure: id, nombre, descripcion
    for (const row of phasesData) {
        const [id, nombre, descripcion] = row;

        await prisma.phases.upsert({
            where: { legacy_phase_id: id },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                name: nombre,
                description: descripcion,
                organization_id: orgId,
                legacy_phase_id: id,
                color: '#3B82F6' // Default color
            } as any
        });
    }
    console.log(`✅ Migrated ${phasesData.length} Phases`);

    // 6. Projects
    console.log('🚀 Migrating Projects...');
    const projectsData = extractTableData(sqlContent, 'projects');
    // Structure: id, nombre, cliente_id, monto_sin_iva, monto_con_iva, created_at, updated_at, phase_id
    for (const row of projectsData) {
        const [id, nombre, cliente_id, monto_sin_iva, monto_con_iva, created_at, updated_at, phase_id] = row;

        // Find client UUID
        const client = await prisma.clients.findUnique({ where: { legacy_client_id: cliente_id } });
        // Find phase UUID
        const phase = phase_id ? await prisma.phases.findUnique({ where: { legacy_phase_id: phase_id } }) : null;

        await prisma.projects.upsert({
            where: { legacy_project_id: id },
            update: {},
            create: {
                name: nombre || 'Unnamed Project',
                description: `Legacy Project (ID: ${id})`,
                amount_with_tax: monto_con_iva || 0, // Fixed: totalAmount -> amount_with_tax
                amount_without_tax: monto_sin_iva || 0, // Fixed: camelCase -> snake_case
                organization_id: orgId,
                legacy_project_id: id,
                client_id: client?.id,
                phase_id: phase?.id,
                status: 'ACTIVE', // Default
                start_date: created_at ? new Date(created_at) : new Date(),
                owner_id: (await prisma.users.findFirst({ where: { organization_id: orgId } }))?.id || '', // Required field owner_id
                id: require('crypto').randomUUID(),
            } as any
        });
    }
    console.log(`✅ Migrated ${projectsData.length} Projects`);

    // 7. Accounts Receivable (Cuentas por Cobrar)
    console.log('💰 Migrating Accounts Receivable...');
    const arData = extractTableData(sqlContent, 'cuentas_por_cobrar');
    // Structure: id, proyecto_id, concepto, monto_sin_iva, monto_con_iva, fecha
    for (const row of arData) {
        const [id, proyecto_id, concepto, monto_sin_iva, monto_con_iva, fecha] = row;

        const project = await prisma.projects.findUnique({ where: { legacy_project_id: proyecto_id } });

        const montoTotal = monto_con_iva || monto_sin_iva || 0;

        await prisma.accounts_receivable.upsert({
            where: { legacy_account_receivable_id: id },
            update: {
                concepto: concepto,
                monto: montoTotal,
                monto_restante: montoTotal, // Default to full amount, will be adjusted by payments
                fecha_vencimiento: fecha ? new Date(fecha) : new Date(),
                status: 'PENDING',
                project_id: project?.id || '',
            },
            create: {
                id: require('crypto').randomUUID(),
                concepto: concepto,
                monto: montoTotal,
                monto_restante: montoTotal,
                fecha_vencimiento: fecha ? new Date(fecha) : new Date(),
                status: 'PENDING',
                organization_id: orgId,
                legacy_account_receivable_id: id,
                project_id: project?.id || '',
            } as any
        });
    }
    console.log(`✅ Migrated ${arData.length} Accounts Receivable`);

    // 8. Payment Complements (Complementos de Pago)
    console.log('💵 Migrating Payment Complements...');
    const pcData = extractTableData(sqlContent, 'complementos_pago');
    // Structure: id, cuenta_id, fecha_pago, concepto, monto_sin_iva, monto_con_iva
    for (const row of pcData) {
        const [id, cuenta_id, fecha_pago, concepto, monto_sin_iva, monto_con_iva] = row;

        const ar = await prisma.accounts_receivable.findUnique({ where: { legacy_account_receivable_id: cuenta_id } });

        if (ar) {
            await prisma.payment_complements.upsert({
                where: { legacy_payment_complement_id: id },
                update: {},
                create: {
                    id: require('crypto').randomUUID(),
                    monto: monto_con_iva || 0, // Fixed: amount -> monto
                    fecha_pago: fecha_pago ? new Date(fecha_pago) : new Date(), // Fixed: date -> fecha_pago
                    account_receivable_id: ar.id,
                    organization_id: orgId,
                    legacy_payment_complement_id: id,
                    cfdi_url: '', // Fixed: cfdiUrl -> cfdi_url
                    // xmlUrl: ''  // Placeholder
                } as any
            });
        }
    }
    console.log(`✅ Migrated ${pcData.length} Payment Complements`);

    // 9. Accounts Payable (Cuentas por Pagar)
    console.log('💸 Migrating Accounts Payable...');
    const apData = extractTableData(sqlContent, 'cuentas_por_pagar');
    // Structure: id, concepto, monto_neto, monto_con_iva, categoria, proveedor_id, fecha, pagado
    for (const row of apData) {
        const [id, concepto, monto_neto, monto_con_iva, categoria, proveedor_id, fecha, pagado] = row;

        const supplier = proveedor_id ? await prisma.suppliers.findUnique({ where: { legacy_supplier_id: proveedor_id } }) : null;

        const montoTotal = monto_con_iva || monto_neto || 0;
        const isPaid = !!pagado;
        const monto_pagado = isPaid ? montoTotal : 0;
        const monto_restante = isPaid ? 0 : montoTotal;

        await prisma.accounts_payable.upsert({
            where: { legacy_account_payable_id: id },
            update: {
                concepto: concepto,
                monto: montoTotal,
                fecha_vencimiento: fecha ? new Date(fecha) : null,
                status: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
                pagado: isPaid,
                monto_pagado: monto_pagado,
                monto_restante: monto_restante,
                supplier_id: supplier?.id,
                notas: `Categoria Legacy: ${categoria}`
            },
            create: {
                id: require('crypto').randomUUID(),
                concepto: concepto,
                monto: montoTotal,
                fecha_vencimiento: fecha ? new Date(fecha) : null,
                status: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
                pagado: isPaid,
                monto_pagado: monto_pagado,
                monto_restante: monto_restante,
                organization_id: orgId,
                legacy_account_payable_id: id,
                supplier_id: supplier?.id,
                notas: `Categoria Legacy: ${categoria}`
            } as any
        });
    }
    console.log(`✅ Migrated ${apData.length} Accounts Payable`);

    // 10. Fixed Costs (Costos Fijos)
    console.log('📉 Migrating Fixed Costs...');
    const fcData = extractTableData(sqlContent, 'costos_fijos');
    // Structure: id, colaborador, puesto, monto_usd, monto_mxn, impuestos_imss, comentarios, ..., fecha, cuenta_creada
    for (const row of fcData) {
        const [id, colaborador, puesto, monto_usd, monto_mxn, impuestos_imss, comentarios, created_at, updated_at, fecha] = row;

        await prisma.fixed_costs.upsert({
            where: { legacy_fixed_cost_id: id },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                nombre: colaborador,
                categoria: puesto || 'General',
                monto: monto_mxn || 0,
                periodicidad: 'Mensual', // Assumed
                dia_vencimiento: fecha ? new Date(fecha).getDate() : 1,
                is_active: true,
                notas: comentarios,
                organization_id: orgId,
                legacy_fixed_cost_id: id,
            } as any
        });
    }
    console.log(`✅ Migrated ${fcData.length} Fixed Costs`);

    // 11. Invoices (Emitidas)
    console.log('🧾 Migrating Invoices...');
    const invData = extractTableData(sqlContent, 'emitidas');
    // Structure: id, rfcReceptor, razonSocial, fechaEmision, subtotal, iva, total, claveSat, descripcion, ...
    for (const row of invData) {
        const [id, rfcReceptor, razonSocial, fechaEmision, subtotal, iva, total, claveSat, descripcion] = row;

        await prisma.invoices.upsert({
            where: { legacy_invoice_id: id },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                // rfcReceptor, // Removed: Not in schema
                // razonSocial, // Removed: Not in schema
                number: `INV-${id}`, // Required field
                amount: total || 0, // Required field
                due_date: new Date(fechaEmision), // Required field
                issue_date: new Date(fechaEmision),
                subtotal: subtotal || 0,
                tax: iva || 0,
                total: total || 0,
                // descripcion, // Removed: Not in schema? Check schema.
                organization_id: orgId,
                legacy_invoice_id: id,
                status: 'PAID', // Default assumption
                documents: {
                    legacy_rfc: rfcReceptor,
                    legacy_razonSocial: razonSocial,
                    legacy_descripcion: descripcion
                }
            } as any
        });
    }
    console.log(`✅ Migrated ${invData.length} Invoices`);

    // 12. Recoveries (Recuperacion)
    console.log('🔄 Migrating Recoveries...');
    const recData = extractTableData(sqlContent, 'recuperacion');
    // Structure: id, concepto, monto, fecha, cliente_id, proyecto_id, ...
    for (const row of recData) {
        const [id, concepto, monto, fecha, cliente_id, proyecto_id] = row;

        const client = await prisma.clients.findUnique({ where: { legacy_client_id: cliente_id } });
        const project = await prisma.projects.findUnique({ where: { legacy_project_id: proyecto_id } });

        if (client) {
            await prisma.recoveries.upsert({
                where: { legacy_recovery_id: id },
                update: {},
                create: {
                    id: require('crypto').randomUUID(),
                    descripcion: concepto,
                    monto_esperado: monto || 0,
                    fecha_inicio: fecha ? new Date(fecha) : new Date(),
                    client_id: client.id,
                    project_id: project?.id,
                    organization_id: orgId,
                    legacy_recovery_id: id,
                } as any
            });
        }
    }
    console.log(`✅ Migrated ${recData.length} Recoveries`);

    // 13. Requisitions (Requisiciones)
    console.log('📝 Migrating Requisitions...');
    const reqData = extractTableData(sqlContent, 'requisiciones');
    // Structure: id, concepto, solicitante, justificacion, area, fecha_requerida, costos, ...
    for (const row of reqData) {
        const [id, concepto, solicitante, justificacion, area, fecha_requerida, costos] = row;

        await prisma.requisitions.upsert({
            where: { legacy_requisition_id: id },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                descripcion: concepto,
                monto: costos || 0,
                fecha_solicitud: new Date(), // Missing in source?
                fecha_requerida: fecha_requerida ? new Date(fecha_requerida) : null,
                status: RequisitionStatus.APPROVED, // Assuming approved based on dump data
                notas: `${justificacion} (Solicitante: ${solicitante}, Area: ${area})`,
                organization_id: orgId,
                legacy_requisition_id: id,
            } as any
        });
    }
    console.log(`✅ Migrated ${reqData.length} Requisitions`);

    // 14. Quotes (Cotizaciones)
    console.log('💬 Migrating Quotes...');
    const quoteData = extractTableData(sqlContent, 'cotizaciones');
    // Structure: id, cliente, proyecto, monto_neto, monto_con_iva, descripcion, documento, estado
    for (const row of quoteData) {
        const [id, cliente_id_str, proyecto_id_str, monto_neto, monto_con_iva, descripcion, documento, estado] = row;

        const client_id = parseInt(cliente_id_str);
        const project_id = parseInt(proyecto_id_str);

        const client = !isNaN(client_id) ? await prisma.clients.findUnique({ where: { legacy_client_id: client_id } }) : null;
        const project = !isNaN(project_id) ? await prisma.projects.findUnique({ where: { legacy_project_id: project_id } }) : null;

        let status: QuoteStatus = QuoteStatus.DRAFT;
        if (estado === 'Aceptada por cliente') status = QuoteStatus.ACCEPTED;
        if (estado === 'No aceptada') status = QuoteStatus.REJECTED;
        if (estado === 'En proceso de aceptación') status = QuoteStatus.SENT;

        await prisma.quotes.upsert({
            where: { legacy_quote_id: id },
            update: {},
            create: {
                id: require('crypto').randomUUID(),
                numero: `QT-${id}`,
                descripcion: descripcion,
                subtotal: monto_neto || 0,
                iva: (monto_con_iva - monto_neto) || 0,
                total: monto_con_iva || 0,
                status: status,
                pdf_url: documento,
                organization_id: orgId,
                legacy_quote_id: id,
                client_id: client?.id,
                project_id: project?.id,
            } as any,
        });
    }
    console.log(`✅ Migrated ${quoteData.length} Quotes`);

    console.log('🎉 Migration Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
