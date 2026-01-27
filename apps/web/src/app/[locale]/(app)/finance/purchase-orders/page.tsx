'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, FileText, Check, X, Send, DollarSign, Calendar, Package, Eye, Download, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder, useSubmitPurchaseOrder, useApprovePurchaseOrder, useRejectPurchaseOrder, useMarkPurchaseOrderAsPaid } from '@/hooks/useFinance'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProjects } from '@/hooks/useProjects'
import { PurchaseOrder } from '@/types'
import { format } from 'date-fns'
import { PODetailsPanel } from '@/components/finance/po/PODetailsPanel'
import { DatePicker } from '@/components/ui/date-picker'
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

import { useAuthStore } from '@/store/auth.store'

export default function PurchaseOrdersPage() {
    const t = useTranslations('financePO')
    const { user } = useAuthStore()
    const isSuperAdmin = user?.email === 'j.molina@runsolutions-services.com'
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
    const [selectedPOForDetails, setSelectedPOForDetails] = useState<PurchaseOrder | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [formSupplierId, setFormSupplierId] = useState<string>('')
    const [formProjectId, setFormProjectId] = useState<string>('')
    const [formIncludesVAT, setFormIncludesVAT] = useState<string>('false')
    const [minPaymentDate, setMinPaymentDate] = useState<Date | undefined>(undefined)
    const [maxPaymentDate, setMaxPaymentDate] = useState<Date | undefined>(undefined)

    const { data: purchaseOrders = [], refetch } = usePurchaseOrders({ search, status: statusFilter })
    const { data: suppliersData } = useSuppliers({ limit: 100 })
    const { data: projectsData } = useProjects()

    // Handle different response structures
    const suppliers = useMemo(() => {
        if (!suppliersData) return []
        if (Array.isArray(suppliersData)) return suppliersData
        if ('data' in suppliersData && Array.isArray(suppliersData.data)) return suppliersData.data
        return []
    }, [suppliersData])

    const projects = useMemo(() => {
        if (!projectsData) return []
        if (Array.isArray(projectsData)) return projectsData
        if ('data' in projectsData && Array.isArray(projectsData.data)) return projectsData.data
        return []
    }, [projectsData])
    const createMutation = useCreatePurchaseOrder()
    const updateMutation = useUpdatePurchaseOrder()
    const deleteMutation = useDeletePurchaseOrder()
    const submitMutation = useSubmitPurchaseOrder()
    const approveMutation = useApprovePurchaseOrder()
    const rejectMutation = useRejectPurchaseOrder()
    const markPaidMutation = useMarkPurchaseOrderAsPaid()

    const handleCreate = () => {
        setSelectedPO(null)
        setFormSupplierId('')
        setFormProjectId('')
        setFormIncludesVAT('false')
        setMinPaymentDate(undefined)
        setMaxPaymentDate(undefined)
        setIsDialogOpen(true)
    }

    const handleEdit = (po: PurchaseOrder) => {
        setSelectedPO(po)
        setFormSupplierId(po.supplierId || '')
        setFormProjectId(po.projectId || '')
        setFormIncludesVAT(po.includesVAT ? 'true' : 'false')
        setMinPaymentDate(po.minPaymentDate ? new Date(po.minPaymentDate) : undefined)
        setMaxPaymentDate(po.maxPaymentDate ? new Date(po.maxPaymentDate) : undefined)
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const comments = formData.get('comments') as string

        if (!minPaymentDate || !maxPaymentDate) {
            toast.error('Seleccione las fechas de pago mínima y máxima')
            return
        }

        const data: any = {
            folio: formData.get('folio') as string,
            description: formData.get('description') as string,
            amount: parseFloat(formData.get('amount') as string),
            includesVAT: formIncludesVAT === 'true',
            minPaymentDate: minPaymentDate.toISOString().split('T')[0],
            maxPaymentDate: maxPaymentDate.toISOString().split('T')[0],
        }

        // Only add optional fields if they have values
        if (formSupplierId && formSupplierId !== '') data.supplierId = formSupplierId
        if (formProjectId && formProjectId !== '') data.projectId = formProjectId
        if (comments && comments.trim() !== '') data.comments = comments

        try {
            if (selectedPO) {
                await updateMutation.mutateAsync({ id: selectedPO.id, data })
                toast.success('Orden de compra actualizada correctamente')
            } else {
                await createMutation.mutateAsync(data)
                toast.success('Orden de compra creada correctamente')
            }
            setIsDialogOpen(false)
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ocurrió un error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta orden de compra?')) return
        try {
            await deleteMutation.mutateAsync(id)
            toast.success('Orden de compra eliminada correctamente')
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ocurrió un error')
        }
    }

    const handleSubmitForApproval = async (id: string) => {
        try {
            await submitMutation.mutateAsync(id)
            toast.success('Orden de compra enviada para aprobación')
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ocurrió un error')
        }
    }

    const handleApprove = async (id: string) => {
        try {
            await approveMutation.mutateAsync(id)
            toast.success('Orden de compra aprobada')
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ocurrió un error')
        }
    }

    const handleReject = async (id: string) => {
        try {
            await rejectMutation.mutateAsync(id)
            toast.success('Orden de compra rechazada')
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ocurrió un error')
        }
    }

    const handleMarkPaid = async (id: string) => {
        try {
            await markPaidMutation.mutateAsync(id)
            toast.success('Orden de compra marcada como pagada')
            refetch()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ocurrió un error')
        }
    }

    const handleViewDetails = (po: PurchaseOrder) => {
        setSelectedPOForDetails(po)
        setIsDetailsPanelOpen(true)
    }

    const handleGeneratePDF = async (po: PurchaseOrder) => {
        try {
            // Call backend endpoint which has organization-specific branding
            const response = await api.get(`/finance/purchase-orders/${po.id}/pdf`, {
                responseType: 'blob'
            })

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `orden-compra-${po.folio || po.id}.pdf`
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

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <p className="text-gray-500 mt-1">{t('subtitle')}</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Orden
                </Button>
            </div>

            <div className="flex gap-4 mb-6">
                <Input
                    placeholder="Buscar por folio o descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={statusFilter || 'ALL'} onValueChange={(value) => setStatusFilter(value === 'ALL' ? '' : value)}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                        <SelectItem value="PENDING">Pendiente</SelectItem>
                        <SelectItem value="APPROVED">Aprobada</SelectItem>
                        <SelectItem value="REJECTED">Rechazada</SelectItem>
                        <SelectItem value="PAID">Pagada</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Folio</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Monto Total</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha Límite Pago</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {purchaseOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                                    No hay órdenes de compra
                                </TableCell>
                            </TableRow>
                        ) : (
                            purchaseOrders.map((po: PurchaseOrder) => (
                                <TableRow
                                    key={po.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleViewDetails(po)}
                                >
                                    <TableCell className="font-medium">{po.folio}</TableCell>
                                    <TableCell className="max-w-xs truncate">{po.description}</TableCell>
                                    <TableCell>{po.supplier?.nombre || '-'}</TableCell>
                                    <TableCell>{po.project?.name || '-'}</TableCell>
                                    <TableCell>${parseFloat(po.total as any).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell>
                                        <Badge className={STATUS_COLORS[po.status]}>
                                            {STATUS_LABELS[po.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{format(new Date(po.maxPaymentDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex gap-1 justify-end">
                                            <Button size="icon" variant="ghost" onClick={() => handleViewDetails(po)} title="Ver detalles">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleGeneratePDF(po)} title="Descargar PDF">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="ghost">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {(po.status === 'DRAFT' || isSuperAdmin) && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleEdit(po)}>
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            {po.status === 'DRAFT' && (
                                                                <DropdownMenuItem onClick={() => handleSubmitForApproval(po.id)}>
                                                                    <Send className="w-4 h-4 mr-2" />
                                                                    Enviar para Aprobación
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleDelete(po.id)} className="text-red-600">
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {po.status === 'PENDING' && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleApprove(po.id)} className="text-green-600">
                                                                <Check className="w-4 h-4 mr-2" />
                                                                Aprobar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleReject(po.id)} className="text-red-600">
                                                                <X className="w-4 h-4 mr-2" />
                                                                Rechazar
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {po.status === 'APPROVED' && (
                                                        <DropdownMenuItem onClick={() => handleMarkPaid(po.id)}>
                                                            <DollarSign className="w-4 h-4 mr-2" />
                                                            Marcar como Pagada
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedPO ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</DialogTitle>
                        <DialogDescription>
                            Complete los datos de la orden de compra
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="folio">Folio *</Label>
                                    <Input id="folio" name="folio" required defaultValue={selectedPO?.folio} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Monto *</Label>
                                    <Input id="amount" name="amount" type="number" step="0.01" required defaultValue={selectedPO?.amount} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción *</Label>
                                <Textarea id="description" name="description" required defaultValue={selectedPO?.description} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="supplierId">Proveedor (Opcional)</Label>
                                    <Select value={formSupplierId || undefined} onValueChange={setFormSupplierId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar proveedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((supplier: any) => (
                                                <SelectItem key={supplier.id} value={supplier.id}>
                                                    {supplier.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="projectId">Proyecto (Opcional)</Label>
                                    <Select value={formProjectId || undefined} onValueChange={setFormProjectId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar proyecto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map((project: any) => (
                                                <SelectItem key={project.id} value={project.id}>
                                                    {project.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="includesVAT">El monto incluye IVA</Label>
                                <Select value={formIncludesVAT} onValueChange={setFormIncludesVAT}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="false">No - El monto es sin IVA</SelectItem>
                                        <SelectItem value="true">Sí - El monto incluye IVA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="minPaymentDate">Fecha Mínima de Pago *</Label>
                                    <DatePicker
                                        date={minPaymentDate}
                                        onDateChange={setMinPaymentDate}
                                        placeholder="Seleccionar fecha mínima"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxPaymentDate">Fecha Máxima de Pago *</Label>
                                    <DatePicker
                                        date={maxPaymentDate}
                                        onDateChange={setMaxPaymentDate}
                                        placeholder="Seleccionar fecha máxima"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="comments">Comentarios</Label>
                                <Textarea id="comments" name="comments" defaultValue={selectedPO?.comments} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Details Panel */}
            <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Detalles de la Orden de Compra</SheetTitle>
                        <SheetDescription>
                            Información completa de la orden de compra
                        </SheetDescription>
                    </SheetHeader>
                    {selectedPOForDetails && (
                        <div className="mt-6">
                            <PODetailsPanel
                                purchaseOrder={selectedPOForDetails}
                                onSubmit={handleSubmitForApproval}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onMarkPaid={handleMarkPaid}
                            />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
