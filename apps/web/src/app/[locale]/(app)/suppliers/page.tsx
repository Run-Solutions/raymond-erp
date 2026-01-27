'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Building2, Mail, Phone, User, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Button from '@/components/ui/button'
import Badge from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import Loader from '@/components/ui/loader'
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet"
import { SupplierForm } from '@/components/suppliers/SupplierForm'
import { SupplierDetailsPanel } from '@/components/suppliers/SupplierDetailsPanel'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export default function SuppliersPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const limit = 10
    const t = useTranslations('suppliers')

    const { data: response, isLoading: loading } = useSuppliers({ page, limit, search: searchTerm })
    // Handle different response structures based on how useSuppliers returns data
    const suppliers = Array.isArray(response) ? response : (response?.data || [])
    const meta = !Array.isArray(response) ? response?.meta : null

    const createSupplier = useCreateSupplier()

    const handleCreate = async (data: any) => {
        try {
            await createSupplier.mutateAsync(data)
            toast.success(t('createDialog.success'))
            setIsCreateOpen(false)
        } catch (error) {
            toast.error(t('createDialog.error'))
            console.error(error)
        }
    }

    // Client-side filtering if API returns all data (fallback)
    const filteredSuppliers = suppliers

    return (
        <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 flex-none">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('create')}
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-3 sm:p-4 flex-none">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <Button variant="secondary" className="w-full sm:w-auto">
                        <Filter className="w-4 h-4 mr-2" />
                        {t('filters.title', { defaultValue: 'Filters' })}
                    </Button>
                </div>
            </Card>

            {/* Suppliers Table */}
            <Card className="flex-1 overflow-hidden border-0 shadow-sm bg-transparent">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader size="lg" text={t('loading')} />
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                        <Building2 className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{t('empty.title')}</p>
                        <p className="text-sm text-gray-400">{t('empty.description')}</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-auto h-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 dark:bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                                        <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredSuppliers.map((supplier: any) => (
                                        <tr
                                            key={supplier.id}
                                            onClick={() => setSelectedSupplierId(supplier.id)}
                                            className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors duration-200"
                                        >
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                <div className="flex items-center gap-2 lg:gap-3">
                                                    <Avatar className="h-8 w-8 lg:h-9 lg:w-9 border border-gray-100 dark:border-gray-700">
                                                        <AvatarImage src={undefined} />
                                                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium text-xs">
                                                            {supplier.nombre.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-sm lg:text-base text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors truncate">
                                                            {supplier.nombre}
                                                        </span>
                                                        {supplier.rfc && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {supplier.rfc}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                                                    <User className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400" />
                                                    <span className="truncate">{supplier.contacto || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                                                    <Mail className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400" />
                                                    <span className="truncate">{supplier.email || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                {supplier.telefono && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 lg:h-8 lg:w-8 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`https://wa.me/+${supplier.countryCode || '52'}${supplier.telefono?.replace(/[^0-9]/g, '')}`, '_blank');
                                                        }}
                                                        title="Chat on WhatsApp"
                                                    >
                                                        <Phone className="w-3 h-3 lg:w-4 lg:h-4" />
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="px-4 lg:px-6 py-3 lg:py-4">
                                                <Badge variant={supplier.isActive ? 'success' : 'secondary'} className="shadow-sm text-xs">
                                                    {supplier.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                            {filteredSuppliers.map((supplier: any) => (
                                <Card
                                    key={supplier.id}
                                    onClick={() => setSelectedSupplierId(supplier.id)}
                                    className="p-4 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Avatar className="h-10 w-10 border border-gray-100 dark:border-gray-700 shrink-0">
                                                    <AvatarImage src={undefined} />
                                                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                                                        {supplier.nombre.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                                                        {supplier.nombre}
                                                    </h3>
                                                    {supplier.rfc && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                            {supplier.rfc}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={supplier.isActive ? 'success' : 'secondary'} className="shrink-0 text-xs">
                                                {supplier.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            {supplier.contacto && (
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <span className="truncate">{supplier.contacto}</span>
                                                </div>
                                            )}
                                            {supplier.email && (
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <span className="truncate">{supplier.email}</span>
                                                </div>
                                            )}
                                            {supplier.telefono && (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`https://wa.me/+${supplier.countryCode || '52'}${supplier.telefono?.replace(/[^0-9]/g, '')}`, '_blank');
                                                        }}
                                                    >
                                                        <Phone className="w-4 h-4 mr-2" />
                                                        {supplier.telefono}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </Card>

            {/* Pagination */}
            {meta && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, meta.total)}</span> of <span className="font-medium">{meta.total}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="text-xs sm:text-sm"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= (meta.totalPages || Math.ceil(meta.total / limit))}
                            className="text-xs sm:text-sm"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">{t('createDialog.title')}</DialogTitle>
                    </DialogHeader>
                    <SupplierForm
                        onSubmit={handleCreate}
                        isLoading={createSupplier.isPending}
                        onCancel={() => setIsCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Details Sheet */}
            <Sheet open={!!selectedSupplierId} onOpenChange={(open) => !open && setSelectedSupplierId(null)}>
                <SheetContent
                    side="right"
                    className="w-[400px] sm:w-[540px] md:w-[700px] p-0 border-l border-gray-200 dark:border-gray-800"
                >
                    <SheetTitle className="sr-only">Supplier Details</SheetTitle>
                    {selectedSupplierId && (
                        <SupplierDetailsPanel
                            supplierId={selectedSupplierId}
                            onClose={() => setSelectedSupplierId(null)}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
