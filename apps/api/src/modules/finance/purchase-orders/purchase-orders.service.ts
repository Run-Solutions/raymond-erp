import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { PurchaseOrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import PDFDocument = require('pdfkit');
import { NotificationsService } from '../../notifications/notifications.service';
import sharp from 'sharp';

@Injectable()
export class PurchaseOrdersService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Calculate subtotal, VAT, and total from amount
     */
    private calculateAmounts(amount: number, includesVAT: boolean) {
        const VAT_RATE = 0.16;
        let subtotal: Decimal;
        let vat: Decimal;
        let total: Decimal;

        if (includesVAT) {
            // Amount includes VAT, we need to extract it
            total = new Decimal(amount);
            subtotal = total.div(new Decimal(1).add(VAT_RATE));
            vat = total.minus(subtotal);
        } else {
            // Amount does NOT include VAT - no VAT should be added
            subtotal = new Decimal(amount);
            vat = new Decimal(0);
            total = subtotal;
        }

        return {
            subtotal,
            vat,
            total,
        };
    }

    async create(organization_id: string, user_id: string, createDto: CreatePurchaseOrderDto) {
        // Check if folio already exists
        const existingPO = await this.prisma.purchase_orders.findUnique({
            where: { folio: createDto.folio },
        });

        if (existingPO) {
            throw new BadRequestException('Folio already exists');
        }

        // Calculate amounts
        const { subtotal, vat, total } = this.calculateAmounts(
            createDto.amount,
            createDto.includesVAT ?? false
        );

        const purchaseOrder = await this.prisma.purchase_orders.create({
            data: {
                id: require('crypto').randomUUID(),
                folio: createDto.folio,
                description: createDto.description,
                amount: createDto.amount,
                includes_vat: createDto.includesVAT ?? false, // Fixed: snake_case
                subtotal,
                vat,
                total,
                comments: createDto.comments,
                supplier_id: createDto.supplier_id,
                project_id: createDto.project_id,
                min_payment_date: new Date(createDto.minPaymentDate), // Fixed: snake_case
                max_payment_date: new Date(createDto.maxPaymentDate), // Fixed: snake_case
                status: createDto.status ?? PurchaseOrderStatus.DRAFT,
                created_by_id: user_id,
                organization_id,
                updated_at: new Date(),
            } as any,
            include: {
                suppliers: {
                    select: {
                        id: true,
                        nombre: true,
                        rfc: true,
                    },
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
                organizations: {
                    select: {
                        id: true,
                        name: true,
                        logo_url: true,
                        logo_zoom: true,
                        primary_color: true,
                        secondary_color: true,
                    },
                },
            },
        });

        // Notify creator
        try {
            await this.notificationsService.notifyPurchaseOrderCreated(
                purchaseOrder.id,
                user_id,
                purchaseOrder.folio,
                organization_id,
            );
        } catch (error) {
            console.error('Failed to send purchase order notification:', error);
        }

        return purchaseOrder;
    }

    async findAll(organization_id: string | null, query: QueryPurchaseOrderDto) {
        // CRITICAL: organization_id can be null for SuperAdmin
        if (!organization_id) {
            return {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 20,
                    totalPages: 0,
                },
            };
        }

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const { search, status, supplier_id, project_id } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            organization_id, // This will be enforced by the extension
        };

        if (status) {
            where.status = status;
        }

        if (supplier_id) {
            where.supplier_id = supplier_id;
        }

        if (project_id) {
            where.project_id = project_id;
        }

        if (search) {
            where.OR = [
                { folio: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { comments: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.purchase_orders.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc', // Fixed: snake_case
                },
                include: {
                    suppliers: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                    projects: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    users: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                    organizations: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.purchase_orders.count({ where }),
        ]);

        return {
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, organization_id: string) {
        const item = await this.prisma.purchase_orders.findFirst({
            where: {
                id,
                organization_id,
            },
            include: {
                suppliers: true,
                projects: true,
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                    },
                },
                organizations: {
                    select: {
                        id: true,
                        name: true,
                        logo_url: true,
                        logo_zoom: true,
                        primary_color: true,
                        secondary_color: true,
                        accent_color: true,
                    },
                },
            },
        });

        if (!item) {
            throw new NotFoundException('Purchase Order not found');
        }

        // Get creator information separately
        const creator = await this.prisma.users.findUnique({
            where: { id: item.created_by_id },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
            },
        });

        return {
            ...item,
            createdBy: creator,
            authorizedBy: item.users, // Rename users to authorizedBy for consistency
        };
    }

    async update(id: string, organization_id: string, updateDto: UpdatePurchaseOrderDto) {
        await this.findOne(id, organization_id);

        // If amount or includesVAT is being updated, recalculate amounts
        let calculatedAmounts: any = {};
        if (updateDto.amount !== undefined || updateDto.includesVAT !== undefined) {
            const currentPO = await this.prisma.purchase_orders.findUnique({
                where: { id },
            });

            const amount = updateDto.amount ?? Number(currentPO.amount);
            const includesVAT = updateDto.includesVAT ?? currentPO.includesVAT;

            calculatedAmounts = this.calculateAmounts(amount, includesVAT);
        }

        // Convert date strings to Date objects
        const updateData: any = { ...updateDto };
        if (updateDto.minPaymentDate) {
            updateData.minPaymentDate = new Date(updateDto.minPaymentDate);
        }
        if (updateDto.maxPaymentDate) {
            updateData.maxPaymentDate = new Date(updateDto.maxPaymentDate);
        }

        return this.prisma.purchase_orders.update({
            where: { id },
            data: {
                ...updateData,
                ...calculatedAmounts,
                updated_at: new Date(),
            },
            include: {
                suppliers: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    },
                },
                organizations: {
                    select: {
                        id: true,
                        name: true,
                        logo_url: true,
                        logo_zoom: true,
                    },
                },
            },
        });
    }

    async remove(id: string, organization_id: string) {
        await this.findOne(id, organization_id);

        return this.prisma.purchase_orders.delete({
            where: { id },
        });
    }

    /**
     * Approve a purchase order
     */
    async approve(id: string, organization_id: string, user_id: string) {
        const po = await this.findOne(id, organization_id);

        if (po.status !== PurchaseOrderStatus.PENDING) {
            throw new BadRequestException('Can only approve purchase orders with PENDING status');
        }

        const updatedPO = await this.prisma.purchase_orders.update({
            where: { id },
            data: {
                status: PurchaseOrderStatus.APPROVED,
                authorized_by_id: user_id,
                authorized_at: new Date(),
                updated_at: new Date(),
            },
            include: {
                suppliers: true,
                projects: true,
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    },
                },
                organizations: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Notify creator
        try {
            await this.notificationsService.notifyPurchaseOrderStatusChanged(
                id,
                po.created_by_id,
                po.folio,
                'APPROVED',
                organization_id,
            );
        } catch (error) {
            console.error('Failed to send purchase order approval notification:', error);
        }

        return updatedPO;
    }

    /**
     * Reject a purchase order
     */
    async reject(id: string, organization_id: string, user_id: string) {
        const po = await this.findOne(id, organization_id);

        if (po.status !== PurchaseOrderStatus.PENDING) {
            throw new BadRequestException('Can only reject purchase orders with PENDING status');
        }

        const updatedPO = await this.prisma.purchase_orders.update({
            where: { id },
            data: {
                status: PurchaseOrderStatus.REJECTED,
                authorized_by_id: user_id,
                authorized_at: new Date(),
                updated_at: new Date(),
            },
            include: {
                suppliers: true,
                projects: true,
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    },
                },
                organizations: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Notify creator
        try {
            await this.notificationsService.notifyPurchaseOrderStatusChanged(
                id,
                po.created_by_id,
                po.folio,
                'REJECTED',
                organization_id,
            );
        } catch (error) {
            console.error('Failed to send purchase order rejection notification:', error);
        }

        return updatedPO;
    }

    /**
     * Mark a purchase order as paid
     */
    async markAsPaid(id: string, organization_id: string) {
        const po = await this.findOne(id, organization_id);

        if (po.status !== PurchaseOrderStatus.APPROVED) {
            throw new BadRequestException('Can only mark approved purchase orders as paid');
        }

        return this.prisma.purchase_orders.update({
            where: { id },
            data: {
                status: PurchaseOrderStatus.PAID,
                updated_at: new Date(),
            },
            include: {
                suppliers: true,
                projects: true,
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    },
                },
                organizations: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Submit for approval (DRAFT → PENDING)
     */
    async submitForApproval(id: string, organization_id: string) {
        const po = await this.findOne(id, organization_id);

        if (po.status !== PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException('Can only submit draft purchase orders for approval');
        }

        return this.prisma.purchase_orders.update({
            where: { id },
            data: {
                status: PurchaseOrderStatus.PENDING,
                updated_at: new Date(),
            },
            include: {
                suppliers: true,
                projects: true,
                users: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                    },
                },
                organizations: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Get statistics
     */
    async getStatistics(organization_id: string) {
        const [totalByStatus, totalAmount] = await Promise.all([
            this.prisma.purchase_orders.groupBy({
                by: ['status'],
                where: { organization_id },
                _count: true,
                _sum: { total: true },
            }),
            this.prisma.purchase_orders.aggregate({
                where: { organization_id },
                _sum: { total: true },
            }),
        ]);

        const stats = {
            draft: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            paid: 0,
            totalAmount: totalAmount._sum.total || 0,
            draftAmount: 0,
            pendingAmount: 0,
            approvedAmount: 0,
            paidAmount: 0,
        };

        totalByStatus.forEach((item) => {
            const status = item.status.toLowerCase();
            stats[`${status}`] = item._count;
            stats[`${status}Amount`] = Number(item._sum.total || 0);
        });

        return stats;
    }

    /**
     * Helper: Format date in Spanish
     */
    private formatSpanishDate(date: Date | string | null | undefined): string {
        if (!date) return '__/__/____';

        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(dateObj.getTime())) return '__/__/____';

            return dateObj.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return '__/__/____';
        }
    }

    /**
     * Generate PDF for a purchase order with professional design
     */
    async generatePdf(id: string, organization_id: string): Promise<Buffer> {
        const po = await this.findOne(id, organization_id);

        return new Promise(async (resolve, reject) => {
            // Pre-process logo if it exists
            let logoBuffer: Buffer | null = null;
            if (po.organizations?.logo_url) {
                try {
                    const logoDataMatch = po.organizations.logo_url.match(/^data:image\/\w+;base64,(.+)$/);
                    if (logoDataMatch) {
                        const originalBuffer = Buffer.from(logoDataMatch[1], 'base64');
                        // Resize logo BEFORE creating PDF
                        logoBuffer = await sharp(originalBuffer)
                            .resize(200, 200, { fit: 'inside' })
                            .png()
                            .toBuffer();
                        console.log('✅ Logo pre-processed:', logoBuffer.length, 'bytes');
                    }
                } catch (err) {
                    console.warn('Logo pre-processing failed:', err);
                }
            }

            // Now create the PDF

            try {
                const doc = new PDFDocument({
                    size: 'LETTER',
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Page dimensions
                const pageWidth = 612; // Letter width in points
                const pageHeight = 792; // Letter height in points
                const marginX = 42.52; // 15mm in points
                const contentWidth = pageWidth - (marginX * 2);

                // Organization colors (default to RUN colors if not set)
                const primaryColor = po.organizations?.primary_color || '#C80000';
                const orgName = po.organizations?.name?.trim() || 'ORGANIZACIÓN';

                // Calculate center position for rotated text
                const centerX = pageWidth / 2;
                const centerY = pageHeight / 2;

                // ===== LOGO (FIRST - before any transformations) =====
                console.log('════════════ ADDING LOGO TO PDF ════════════');
                console.log('logoBuffer exists?', !!logoBuffer);
                console.log('logoBuffer size:', logoBuffer ? logoBuffer.length : 'N/A');
                if (logoBuffer) {
                    try {
                        const logoZoom = po.organizations.logo_zoom || 1.0;
                        const logoSize = 45 * logoZoom;
                        const logoX = pageWidth - logoSize - 15;
                        const logoY = 5.5;

                        console.log('Calling doc.image()...');
                        doc.image(logoBuffer, logoX, logoY, {
                            width: logoSize,
                            height: logoSize
                        });
                        console.log('✅✅✅ LOGO ADDED TO PDF SUCCESSFULLY! ✅✅✅');
                    } catch (logoError) {
                        console.error('❌❌❌ ERROR ADDING LOGO:', logoError);
                        if (logoError instanceof Error) {
                            console.error(logoError.stack);
                        }
                    }
                } else {
                    console.log('⚠️  Logo buffer is null - skipping logo');
                }
                console.log('════════════ LOGO SECTION COMPLETE ════════════');

                // ===== WATERMARK =====
                doc.save();
                doc.fillColor('#F5F5F5')
                   .fontSize(85)
                   .font('Helvetica-Bold');

                // Rotate and add watermark
                doc.rotate(35, { origin: [centerX, centerY] });
                doc.text(orgName.toUpperCase(), centerX - 200, centerY - 60, {
                    width: 400,
                    align: 'center'
                });

                doc.restore();

                // ===== HEADER =====
                doc.fillColor(primaryColor)
                   .rect(0, 0, pageWidth, 56.69)
                   .fill();

                doc.fillColor('#FFFFFF')
                   .fontSize(14)
                   .font('Helvetica-Bold')
                   .text('ORDEN DE AUTORIZACIÓN Y COMPRA', 0, 25.51, {
                       width: pageWidth,
                       align: 'center'
                   });

                doc.fontSize(9)
                   .text(orgName.toUpperCase(), 0, 45.35, {
                       width: pageWidth,
                       align: 'center'
                   });

                // Reset to black for content
                doc.fillColor('#000000');

                // ===== INTRO TEXT =====
                let y = 65; // Start higher
                doc.fontSize(10)
                   .font('Helvetica')
                   .text('Documento interno de autorización y compra.', marginX, y);

                y += 18; // Reduced spacing

                // ===== MAIN DATA BLOCK =====
                const metaBoxY = y;
                const metaBoxHeight = 90.71; // 32mm

                doc.strokeColor('#B4B4B4')
                   .lineWidth(0.85)
                   .rect(marginX, metaBoxY, contentWidth, metaBoxHeight)
                   .stroke();

                y = metaBoxY + 19.84; // 7mm from top
                const col2X = marginX + (contentWidth / 2);

                // Format amounts
                const formatter = new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                    minimumFractionDigits: 2,
                });

                // Line 1: Folio and creation date
                doc.font('Helvetica-Bold').fontSize(10);
                doc.text('Folio:', marginX + 5.67, y);
                doc.font('Helvetica');
                doc.text(po.folio || '________', marginX + 40, y);

                doc.font('Helvetica-Bold');
                doc.text('Fecha creación OC:', col2X, y);
                doc.font('Helvetica');
                doc.text(this.formatSpanishDate(po.created_at), col2X + 110, y);

                // Line 2: Requester
                y += 17.01;
                doc.font('Helvetica-Bold');
                doc.text('Solicitante / Quien autoriza:', marginX + 5.67, y);
                doc.font('Helvetica');
                const requester = po.createdBy ? `${po.createdBy.first_name} ${po.createdBy.last_name}` : 'Dirección General';
                doc.text(requester, marginX + 165, y);

                // Line 3: Amount
                y += 17.01;
                doc.font('Helvetica-Bold');
                doc.text('Monto autorizado (MXN):', marginX + 5.67, y);
                doc.font('Helvetica');
                doc.text(formatter.format(Number(po.total)), marginX + 165, y);

                // Line 4: Payment dates
                y += 17.01;
                doc.font('Helvetica-Bold');
                doc.text('Fecha mínima de pago:', marginX + 5.67, y);
                doc.font('Helvetica');
                doc.text(this.formatSpanishDate(po.min_payment_date), marginX + 130, y);

                doc.font('Helvetica-Bold');
                doc.text('Fecha máxima de pago:', col2X, y);
                doc.font('Helvetica');
                doc.text(this.formatSpanishDate(po.max_payment_date), col2X + 125, y);

                // Dates legend
                y = metaBoxY + metaBoxHeight + 10;
                doc.fontSize(8)
                   .fillColor('#505050')
                   .text('Las fechas proporcionadas son aproximadas y siempre se recomienda considerar la fecha máxima de pago.',
                         marginX, y, { width: contentWidth });

                // ===== DESCRIPTION SECTION =====
                y += 16;
                const descHeaderY = y;

                doc.fillColor('#F0F0F0')
                   .rect(marginX, descHeaderY, contentWidth, 19.84)
                   .fill();

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, descHeaderY, contentWidth, 19.84)
                   .stroke();

                doc.fillColor('#000000')
                   .font('Helvetica-Bold')
                   .fontSize(10)
                   .text('DESCRIPCIÓN / CONCEPTO', marginX + 5.67, descHeaderY + 6);

                const descBoxY = descHeaderY + 19.84;
                const descBoxHeight = 113.39;

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, descBoxY, contentWidth, descBoxHeight)
                   .stroke();

                doc.font('Helvetica')
                   .text(po.description || 'Sin descripción', marginX + 8.50, descBoxY + 19.84, {
                       width: contentWidth - 17.01,
                       align: 'left'
                   });

                // ===== COMMENTS SECTION =====
                y = descBoxY + descBoxHeight + 16;
                const comHeaderY = y;

                doc.fillColor('#F0F0F0')
                   .rect(marginX, comHeaderY, contentWidth, 19.84)
                   .fill();

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, comHeaderY, contentWidth, 19.84)
                   .stroke();

                doc.fillColor('#000000')
                   .font('Helvetica-Bold')
                   .text('COMENTARIOS / NOTAS ADICIONALES', marginX + 5.67, comHeaderY + 6);

                const comBoxY = comHeaderY + 19.84;
                const comBoxHeight = 99.21;

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, comBoxY, contentWidth, comBoxHeight)
                   .stroke();

                doc.font('Helvetica')
                   .text(po.comments || 'Sin comentarios', marginX + 8.50, comBoxY + 19.84, {
                       width: contentWidth - 17.01,
                       align: 'left'
                   });

                // ===== AMOUNTS SUMMARY =====
                y = comBoxY + comBoxHeight + 16;
                const resumenHeaderY = y;

                doc.fillColor('#F0F0F0')
                   .rect(marginX, resumenHeaderY, contentWidth, 19.84)
                   .fill();

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, resumenHeaderY, contentWidth, 19.84)
                   .stroke();

                doc.fillColor('#000000')
                   .font('Helvetica-Bold')
                   .fontSize(10)
                   .text('RESUMEN DE MONTOS', marginX + 5.67, resumenHeaderY + 6);

                const resumenBoxY = resumenHeaderY + 19.84;
                const resumenBoxHeight = 51.02;

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, resumenBoxY, contentWidth, resumenBoxHeight)
                   .stroke();

                const labelX = marginX + 8.50;
                const valueX = marginX + contentWidth - 8.50;
                let ry = resumenBoxY + 17.01;

                doc.font('Helvetica');
                doc.text('Subtotal:', labelX, ry);
                doc.text(formatter.format(Number(po.subtotal)), labelX, ry, {
                    width: contentWidth - 17.01,
                    align: 'right'
                });

                ry += 14.17;
                doc.text('IVA 16%:', labelX, ry);
                doc.text(formatter.format(Number(po.vat)), labelX, ry, {
                    width: contentWidth - 17.01,
                    align: 'right'
                });

                ry += 14.17;
                doc.font('Helvetica-Bold');
                doc.text('Total:', labelX, ry);
                doc.text(formatter.format(Number(po.total)), labelX, ry, {
                    width: contentWidth - 17.01,
                    align: 'right'
                });

                // ===== TRACEABILITY SECTION =====
                y = resumenBoxY + resumenBoxHeight + 16;

                // Check if we need a new page
                if (y > 650) {
                    doc.addPage();
                    y = 50;
                }

                const trazaHeaderY = y;

                doc.fillColor('#F0F0F0')
                   .rect(marginX, trazaHeaderY, contentWidth, 19.84)
                   .fill();

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, trazaHeaderY, contentWidth, 19.84)
                   .stroke();

                doc.fillColor('#000000')
                   .font('Helvetica-Bold')
                   .fontSize(10)
                   .text('TRAZABILIDAD', marginX + 5.67, trazaHeaderY + 6);

                const trazaBoxY = trazaHeaderY + 19.84;
                let trazaBoxHeight = 34.02;

                if (po.createdBy) trazaBoxHeight += 17.01;
                if (po.authorizedBy) trazaBoxHeight += 17.01;

                doc.strokeColor('#C8C8C8')
                   .rect(marginX, trazaBoxY, contentWidth, trazaBoxHeight)
                   .stroke();

                doc.font('Helvetica')
                   .fontSize(9);
                let ty = trazaBoxY + 17.01;

                if (po.createdBy) {
                    doc.font('Helvetica-Bold');
                    doc.text('Creado por:', marginX + 8.50, ty);
                    doc.font('Helvetica');
                    doc.text(`${po.createdBy.first_name} ${po.createdBy.last_name}`, marginX + 85.04, ty);

                    doc.font('Helvetica-Bold');
                    doc.text('Fecha:', col2X, ty);
                    doc.font('Helvetica');
                    doc.text(this.formatSpanishDate(po.created_at), col2X + 42.52, ty);
                    ty += 17.01;
                }

                if (po.authorizedBy) {
                    doc.font('Helvetica-Bold');
                    doc.text('Aprobado por:', marginX + 8.50, ty);
                    doc.font('Helvetica');
                    doc.text(`${po.authorizedBy.first_name} ${po.authorizedBy.last_name}`, marginX + 85.04, ty);

                    if (po.authorized_at) {
                        doc.font('Helvetica-Bold');
                        doc.text('Fecha:', col2X, ty);
                        doc.font('Helvetica');
                        doc.text(this.formatSpanishDate(po.authorized_at), col2X + 42.52, ty);
                    }
                }

                // ===== SIGNATURE SECTION =====
                let firmaY = trazaBoxY + trazaBoxHeight + 42.52;

                if (firmaY > 600) {
                    doc.addPage();
                    firmaY = 85.04;
                }

                doc.strokeColor('#000000')
                   .lineWidth(0.85)
                   .moveTo(centerX - 99.21, firmaY)
                   .lineTo(centerX + 99.21, firmaY)
                   .stroke();

                doc.fillColor('#000000')
                   .font('Times-Italic')
                   .fontSize(14)
                   .text('Dirección General', 0, firmaY - 18, {
                       width: pageWidth,
                       align: 'center'
                   });

                doc.font('Helvetica-Bold')
                   .fontSize(10)
                   .text('AUTORIZA', 0, firmaY + 8, {
                       width: pageWidth,
                       align: 'center'
                   })
                   .text('DIRECCIÓN GENERAL', 0, firmaY + 22, {
                       width: pageWidth,
                       align: 'center'
                   });

                // ===== CONFIDENTIALITY LEGEND =====
                const legendBoxY = firmaY + 70.87;

                doc.fillColor('#FAFAFA')
                   .rect(marginX, legendBoxY, contentWidth, 56.69)
                   .fill();

                doc.strokeColor('#DCDCDC')
                   .rect(marginX, legendBoxY, contentWidth, 56.69)
                   .stroke();

                doc.fontSize(8)
                   .fillColor('#787878')
                   .font('Helvetica');

                const legendText = `ESTE ES UN DOCUMENTO CONFIDENCIAL Y DE USO INTERNO DE ${orgName.toUpperCase()}. ` +
                    'Es válido, tanto interna como externamente, como orden de compra y como soporte para la emisión de facturas y demás comprobantes fiscales relacionados. ' +
                    `La aceptación y/o ejecución de esta orden de compra formaliza la relación comercial con ${orgName} y se rige por los contratos, acuerdos marco y términos y condiciones comerciales vigentes entre las partes.`;

                doc.text(legendText, marginX + 8.50, legendBoxY + 19.84, {
                    width: contentWidth - 17.01,
                    align: 'justify'
                });

                doc.text('Documento generado electrónicamente para fines de control interno.',
                    0, legendBoxY + 79.37, {
                        width: pageWidth,
                        align: 'center'
                    });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get human-readable status label
     */
    private getStatusLabel(status: PurchaseOrderStatus): string {
        const labels = {
            [PurchaseOrderStatus.DRAFT]: 'Borrador',
            [PurchaseOrderStatus.PENDING]: 'Pendiente de Aprobación',
            [PurchaseOrderStatus.APPROVED]: 'Aprobada',
            [PurchaseOrderStatus.REJECTED]: 'Rechazada',
            [PurchaseOrderStatus.PAID]: 'Pagada',
        };
        return labels[status] || status;
    }
}
