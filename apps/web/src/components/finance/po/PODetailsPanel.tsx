'use client'

import { FileText, Download, Send, Check, X, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PurchaseOrder } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import api from '@/lib/api'

const STATUS_COLORS = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PAID: 'bg-blue-100 text-blue-800',
}

const STATUS_LABELS = {
    DRAFT: 'Borrador',
    PENDING: 'Pendiente',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
    PAID: 'Pagada',
}

interface PODetailsPanelProps {
    purchaseOrder: PurchaseOrder
    onSubmit?: (id: string) => void
    onApprove?: (id: string) => void
    onReject?: (id: string) => void
    onMarkPaid?: (id: string) => void
}

export function PODetailsPanel({
    purchaseOrder,
    onSubmit,
    onApprove,
    onReject,
    onMarkPaid,
}: PODetailsPanelProps) {
    const handleGeneratePDF = async () => {
        try {
            // Call backend endpoint which has organization-specific branding
            const response = await api.get(`/finance/purchase-orders/${purchaseOrder.id}/pdf`, {
                responseType: 'blob'
            })

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `orden-compra-${purchaseOrder.folio || purchaseOrder.id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast.success('PDF generado correctamente')
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast.error('Error al generar el PDF')
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount)
    }

    // Calculate amounts correctly based on includesVAT
    const calculateAmounts = () => {
        const montoNumero = purchaseOrder.amount || 0;
        let subtotal: number;
        let iva: number;
        let total: number;

        if (purchaseOrder.includesVAT) {
            // If amount includes VAT, we need to separate it
            total = montoNumero;
            subtotal = montoNumero / 1.16;
            iva = montoNumero - subtotal;
        } else {
            // If amount does NOT include VAT, don't add it - the amount IS the total
            subtotal = montoNumero;
            iva = 0;
            total = montoNumero;
        }

        return { subtotal, iva, total };
    }

    const amounts = calculateAmounts();

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A'
        try {
            return format(new Date(dateString), 'dd/MM/yyyy', { locale: es })
        } catch {
            return 'N/A'
        }
    }

    return (
        <div className="space-y-5">
            {/* Header with Status and Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Orden de Compra #{purchaseOrder.folio}</h2>
                    <p className="text-xs text-muted-foreground">
                        Creada el {formatDate(purchaseOrder.createdAt)}
                    </p>
                </div>
                <Badge className={`${STATUS_COLORS[purchaseOrder.status as keyof typeof STATUS_COLORS]} text-xs`}>
                    {STATUS_LABELS[purchaseOrder.status as keyof typeof STATUS_LABELS]}
                </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                <Button onClick={handleGeneratePDF} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Generar PDF
                </Button>

                {purchaseOrder.status === 'DRAFT' && onSubmit && (
                    <Button onClick={() => onSubmit(purchaseOrder.id)} variant="default" size="sm">
                        <Send className="mr-2 h-4 w-4" />
                        Enviar para Aprobación
                    </Button>
                )}

                {purchaseOrder.status === 'PENDING' && onApprove && (
                    <>
                        <Button onClick={() => onApprove(purchaseOrder.id)} variant="default" size="sm">
                            <Check className="mr-2 h-4 w-4" />
                            Aprobar
                        </Button>
                        {onReject && (
                            <Button onClick={() => onReject(purchaseOrder.id)} variant="destructive" size="sm">
                                <X className="mr-2 h-4 w-4" />
                                Rechazar
                            </Button>
                        )}
                    </>
                )}

                {purchaseOrder.status === 'APPROVED' && onMarkPaid && (
                    <Button onClick={() => onMarkPaid(purchaseOrder.id)} variant="default" size="sm">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Marcar como Pagada
                    </Button>
                )}
            </div>

            <Separator />

            {/* Main Information */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Proveedor</p>
                            <p className="text-sm">{purchaseOrder.supplier?.nombre || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Proyecto</p>
                            <p className="text-sm">{purchaseOrder.project?.name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Fecha Mínima de Pago</p>
                            <p className="text-sm">{formatDate(purchaseOrder.minPaymentDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Fecha Máxima de Pago</p>
                            <p className="text-sm">{formatDate(purchaseOrder.maxPaymentDate)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Description */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{purchaseOrder.description || 'Sin descripción'}</p>
                </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Resumen Financiero</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(amounts.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA (16%):</span>
                        <span>{formatCurrency(amounts.iva)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                        <span>Total:</span>
                        <span>{formatCurrency(amounts.total)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Trail */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Trazabilidad</CardTitle>
                    <CardDescription className="text-xs">Historial de creación y aprobación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-start gap-2 p-2.5 bg-muted rounded-lg">
                        <div className="flex-1">
                            <p className="text-xs font-medium">Creado por</p>
                            <p className="text-sm">
                                {purchaseOrder.createdBy
                                    ? `${purchaseOrder.createdBy.firstName} ${purchaseOrder.createdBy.lastName}`
                                    : 'N/A'}
                            </p>
                            {purchaseOrder.createdAt && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(purchaseOrder.createdAt)}
                                </p>
                            )}
                        </div>
                    </div>
                    {purchaseOrder.authorizedBy && (
                        <div className="flex items-start gap-2 p-2.5 bg-green-50 dark:bg-green-950 rounded-lg">
                            <div className="flex-1">
                                <p className="text-xs font-medium text-green-700 dark:text-green-300">Aprobado por</p>
                                <p className="text-sm text-green-900 dark:text-green-100">
                                    {`${purchaseOrder.authorizedBy.firstName} ${purchaseOrder.authorizedBy.lastName}`}
                                </p>
                                {purchaseOrder.authorizedAt && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                        {formatDate(purchaseOrder.authorizedAt)}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {!purchaseOrder.authorizedBy && purchaseOrder.status !== 'DRAFT' && (
                        <div className="flex items-start gap-2 p-2.5 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                Pendiente de aprobación
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notes */}
            {purchaseOrder.comments && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">Notas Adicionales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{purchaseOrder.comments}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
