'use client';

import { useProspect, useProspectStats, useUpdateProspect, useDeleteProspect, useChangeProspectStatus, ProspectStatus } from '@/hooks/useProspects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Loader from '@/components/ui/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Mail, Phone, User, Edit, Trash2,
    Calendar, DollarSign, TrendingUp, FileText, X, Building2, CheckCircle2
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ProspectForm } from '@/components/prospects/ProspectForm';
import { ProspectStatusBadge } from '@/components/prospects/ProspectStatusBadge';
import { ProspectConversionDialog } from '@/components/prospects/ProspectConversionDialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ProspectDetailsPanelProps {
    prospectId: string;
    onClose: () => void;
}

export function ProspectDetailsPanel({ prospectId, onClose }: ProspectDetailsPanelProps) {
    const router = useRouter();
    const { data: prospect, isLoading: isProspectLoading } = useProspect(prospectId);
    const { data: stats, isLoading: isStatsLoading } = useProspectStats(prospectId);
    const updateProspect = useUpdateProspect();
    const deleteProspect = useDeleteProspect();
    const changeStatus = useChangeProspectStatus();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isConvertOpen, setIsConvertOpen] = useState(false);

    const isLoading = isProspectLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader size="lg" text="Loading prospect details..." />
            </div>
        );
    }

    if (!prospect) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Prospect not found</h2>
                <Button variant="outline" onClick={onClose}>
                    Close Panel
                </Button>
            </div>
        );
    }

    const handleUpdate = async (data: any) => {
        try {
            await updateProspect.mutateAsync({ id: prospectId, data });
            toast.success('Prospect updated successfully');
            setIsEditOpen(false);
        } catch (error) {
            toast.error('Failed to update prospect');
            console.error(error);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteProspect.mutateAsync(prospectId);
            toast.success('Prospect deleted successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to delete prospect');
            console.error(error);
        }
    };

    const handleStatusChange = async (newStatus: ProspectStatus) => {
        try {
            await changeStatus.mutateAsync({ id: prospectId, status: newStatus });
            toast.success('Status updated successfully');
        } catch (error) {
            toast.error('Failed to update status');
            console.error(error);
        }
    };

    const handleConvertSuccess = (clientId: string) => {
        toast.success('Prospect converted to client successfully');
        setIsConvertOpen(false);
        onClose();
        // Redirect to clients page (main list) instead of client details
        router.push('/clients');
    };

    const daysInPipeline = stats?.daysInPipeline || 0;
    const estimatedValue = stats?.estimatedValue || null;
    const probability = stats?.probability || null;

    // Get valid next statuses
    const getValidNextStatuses = (currentStatus: ProspectStatus): ProspectStatus[] => {
        const transitions: Record<ProspectStatus, ProspectStatus[]> = {
            [ProspectStatus.NEW]: [ProspectStatus.CONTACTED, ProspectStatus.LOST],
            [ProspectStatus.CONTACTED]: [ProspectStatus.QUALIFIED, ProspectStatus.LOST],
            [ProspectStatus.QUALIFIED]: [ProspectStatus.PROPOSAL_SENT, ProspectStatus.LOST],
            [ProspectStatus.PROPOSAL_SENT]: [ProspectStatus.NEGOTIATION, ProspectStatus.LOST],
            [ProspectStatus.NEGOTIATION]: [ProspectStatus.WON, ProspectStatus.LOST],
            [ProspectStatus.WON]: [],
            [ProspectStatus.LOST]: [],
        };
        return transitions[currentStatus] || [];
    };

    const validNextStatuses = getValidNextStatuses(prospect.status);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-800 shadow-sm">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                {prospect.nombre?.charAt(0) || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1.5">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                {prospect.nombre || 'Unknown Prospect'}
                            </h2>
                            <div className="flex items-center gap-2">
                                <ProspectStatusBadge status={prospect.status} />
                                {prospect.converted_to_client_id && (
                                    <Badge variant="success" className="px-2.5 py-0.5 text-xs font-semibold">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Convertido
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Días en Pipeline</span>
                                <Calendar className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {daysInPipeline}
                            </div>
                        </CardContent>
                    </Card>
                    {estimatedValue !== null && (
                        <Card className="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Valor Estimado</span>
                                    <DollarSign className="w-4 h-4 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    ${estimatedValue.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {probability !== null && (
                        <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Probabilidad</span>
                                    <TrendingUp className="w-4 h-4 text-purple-500" />
                                </div>
                                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                    {probability}%
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {prospect.expected_close_date && (
                        <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Fecha Esperada</span>
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                </div>
                                <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
                                    {new Date(prospect.expected_close_date).toLocaleDateString()}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="w-full justify-start bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        {prospect.status === ProspectStatus.WON && (
                            <TabsTrigger value="conversion">Conversión</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <Card className="border-none shadow-none bg-transparent">
                            <CardContent className="p-0 space-y-6">
                                {/* Contact Info Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <User className="w-4 h-4 text-blue-500" />
                                            Contact Details
                                        </h3>
                                    </div>
                                    <div className="p-5 space-y-6">
                                        {/* Contact Person */}
                                        {prospect.contacto && (
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{prospect.contacto}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Email */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</p>
                                                {prospect.email ? (
                                                    <a href={`mailto:${prospect.email}`} className="text-sm font-medium text-blue-600 hover:underline block truncate" title={prospect.email}>
                                                        {prospect.email}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No email provided</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        {prospect.telefono && (
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                                                    <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone & WhatsApp</p>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            <a href={`tel:${prospect.telefono}`} className="hover:text-blue-600 hover:underline">
                                                                {prospect.telefono}
                                                            </a>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1.5 text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                                                            onClick={() => window.open(`https://wa.me/+${prospect.country_code || '52'}${prospect.telefono.replace(/[^0-9]/g, '')}`, '_blank')}
                                                        >
                                                            <Phone className="w-3 h-3" />
                                                            Chat
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Assigned To */}
                                        {prospect.assigned_to && (
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</p>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={prospect.assigned_to.avatar_url || undefined} />
                                                            <AvatarFallback className="text-xs">
                                                                {prospect.assigned_to.first_name?.charAt(0)}{prospect.assigned_to.last_name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {prospect.assigned_to.first_name} {prospect.assigned_to.last_name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Source */}
                                        {prospect.source && (
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{prospect.source}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {prospect.notes && (
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</p>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{prospect.notes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Footer */}
                                    <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                                        {/* Status Change */}
                                        {validNextStatuses.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cambiar estado:</span>
                                                <Select
                                                    value={prospect.status}
                                                    onValueChange={(value) => handleStatusChange(value as ProspectStatus)}
                                                >
                                                    <SelectTrigger className="w-[200px] h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {validNextStatuses.map((status) => (
                                                            <SelectItem key={status} value={status}>
                                                                {status}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center gap-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditOpen(true)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 text-xs h-8"
                                            >
                                                <Edit className="w-3.5 h-3.5 mr-2" />
                                                Edit Prospect
                                            </Button>
                                            <div className="flex gap-3">
                                                {prospect.status === ProspectStatus.WON && !prospect.converted_to_client_id && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => setIsConvertOpen(true)}
                                                        className="text-xs h-8 bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                                        Convertir a Cliente
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsDeleteOpen(true)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-8"
                                                    disabled={!!prospect.converted_to_client_id}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {prospect.status === ProspectStatus.WON && (
                        <TabsContent value="conversion" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Convertir a Cliente</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Este prospecto está listo para ser convertido en un cliente. Al convertir, se creará un nuevo cliente con la información del prospecto.
                                    </p>
                                    <Button
                                        onClick={() => setIsConvertOpen(true)}
                                        className="w-full"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Convertir a Cliente
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Prospect</DialogTitle>
                    </DialogHeader>
                    <ProspectForm
                        initialData={prospect}
                        onSubmit={handleUpdate}
                        isLoading={updateProspect.isPending}
                        onCancel={() => setIsEditOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Prospect?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the prospect.
                            {prospect.converted_to_client_id && (
                                <span className="block mt-2 text-red-600 font-semibold">
                                    This prospect has been converted to a client and cannot be deleted.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={!!prospect.converted_to_client_id}
                        >
                            {deleteProspect.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Conversion Dialog */}
            {isConvertOpen && (
                <ProspectConversionDialog
                    prospect={prospect}
                    open={isConvertOpen}
                    onOpenChange={setIsConvertOpen}
                    onSuccess={handleConvertSuccess}
                />
            )}
        </div>
    );
}

