'use client';

import { useSupplier, useUpdateSupplier, useDeleteSupplier, useSupplierStats } from '@/hooks/useSuppliers';
import { Card, CardContent } from '@/components/ui/card';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Loader from '@/components/ui/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Mail, Phone, User, Edit, Trash2,
    FileText, Building2, CreditCard
} from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { toast } from 'sonner';

interface SupplierDetailsPanelProps {
    supplierId: string;
    onClose: () => void;
}

export function SupplierDetailsPanel({ supplierId, onClose }: SupplierDetailsPanelProps) {
    const { data: supplier, isLoading: isSupplierLoading } = useSupplier(supplierId);
    // const { data: stats, isLoading: isStatsLoading } = useSupplierStats(supplierId); // Disabled: endpoint doesn't exist yet
    const updateSupplier = useUpdateSupplier();
    const deleteSupplier = useDeleteSupplier();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const isLoading = isSupplierLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader size="lg" text="Loading supplier details..." />
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Supplier not found</h2>
                <Button variant="outline" onClick={onClose}>
                    Close Panel
                </Button>
            </div>
        );
    }

    const handleUpdate = async (data: any) => {
        try {
            await updateSupplier.mutateAsync({ id: supplierId, data });
            toast.success('Supplier updated successfully');
            setIsEditOpen(false);
        } catch (error) {
            toast.error('Failed to update supplier');
            console.error(error);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteSupplier.mutateAsync(supplierId);
            toast.success('Supplier deleted successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to delete supplier');
            console.error(error);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-800 shadow-sm">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                                {supplier.nombre?.charAt(0) || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1.5">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{supplier.nombre || 'Unknown Supplier'}</h2>
                            <div className="flex items-center gap-2">
                                <Badge variant={supplier.isActive ? 'success' : 'secondary'} className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                    {supplier.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                {supplier.rfc && (
                                    <span className="text-xs font-mono text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                        {supplier.rfc}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Payables</span>
                                <FileText className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                {supplier._count?.accountsPayable || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Pending Amount</span>
                                <CreditCard className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {/* Placeholder until we have pending amount in stats */}
                                $0.00
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="w-full justify-start bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="payables">Accounts Payable</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <Card className="border-none shadow-none bg-transparent">
                            <CardContent className="p-0 space-y-6">
                                {/* Contact Info Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <User className="w-4 h-4 text-emerald-500" />
                                            Contact Details
                                        </h3>
                                    </div>
                                    <div className="p-5 space-y-6">
                                        {/* Contact Person */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                                                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.contacto || 'No contact person'}</p>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</p>
                                                {supplier.email ? (
                                                    <a href={`mailto:${supplier.email}`} className="text-sm font-medium text-blue-600 hover:underline block truncate" title={supplier.email}>
                                                        {supplier.email}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No email provided</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phone & WhatsApp */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                                                <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone & WhatsApp</p>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {supplier.telefono ? (
                                                            <a href={`tel:${supplier.telefono}`} className="hover:text-blue-600 hover:underline">
                                                                {supplier.telefono}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400 italic">No phone provided</span>
                                                        )}
                                                    </div>
                                                    {supplier.telefono && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1.5 text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:text-green-800 hover:border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                                            onClick={() => window.open(`https://wa.me/+${supplier.countryCode || '52'}${supplier.telefono?.replace(/[^0-9]/g, '')}`, '_blank')}
                                                        >
                                                            <Phone className="w-3 h-3" />
                                                            Chat
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tax ID */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax ID (RFC)</p>
                                                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{supplier.rfc || 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Details Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-emerald-500" />
                                            Bank Details
                                        </h3>
                                    </div>
                                    <div className="p-5">
                                        {supplier.datosBancarios ? (
                                            <pre className="text-sm font-sans text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                                                {supplier.datosBancarios}
                                            </pre>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">No bank details provided</p>
                                        )}
                                    </div>

                                    {/* Delete Action Footer */}
                                    <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditOpen(true)}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 text-xs h-8"
                                        >
                                            <Edit className="w-3.5 h-3.5 mr-2" />
                                            Edit Supplier
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsDeleteOpen(true)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-8"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                                            Delete Supplier
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payables">
                        <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Accounts Payable module integration coming soon.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Supplier</DialogTitle>
                    </DialogHeader>
                    <SupplierForm
                        initialData={supplier}
                        onSubmit={handleUpdate}
                        isLoading={updateSupplier.isPending}
                        onCancel={() => setIsEditOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the supplier
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {deleteSupplier.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
