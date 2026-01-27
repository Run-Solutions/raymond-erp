"use client";

import { useAccountReceivable, useDeleteAccountReceivable, usePaymentComplementsByAR, usePaymentComplementsByClient, useCreatePaymentComplement } from "@/hooks/useFinance";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from '@/store/auth.store';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/ui/loader";
import {
    Edit,
    Trash2,
    Calendar,
    FileText,
    Briefcase,
    User,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import { ARForm } from "./ARForm";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialMetrics } from "../shared/FinancialMetrics";
import { PaymentHistoryTable } from "../shared/PaymentHistoryTable";

interface ARDetailsPanelProps {
    arId: string;
    onClose: () => void;
}

export function ARDetailsPanel({ arId, onClose }: ARDetailsPanelProps) {
    const { data: ar, isLoading } = useAccountReceivable(arId);
    const deleteAR = useDeleteAccountReceivable();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
    const [paymentReference, setPaymentReference] = useState('');
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'date' | 'client'>('date');

    // Fetch payments based on view mode
    const { data: paymentsByAR, isLoading: isLoadingPaymentsByAR } = usePaymentComplementsByAR(arId);
    const { data: paymentsByClient, isLoading: isLoadingPaymentsByClient } = usePaymentComplementsByClient(
        ar?.client?.id || '',
        { enabled: viewMode === 'client' && !!ar?.client?.id }
    );

    // Determine which payments to use based on view mode
    const payments = viewMode === 'client' ? (paymentsByClient || []) : (paymentsByAR || []);
    const isLoadingPayments = viewMode === 'client' ? isLoadingPaymentsByClient : isLoadingPaymentsByAR;

    const createPayment = useCreatePaymentComplement();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader size="lg" text="Loading details..." />
            </div>
        );
    }

    if (!ar) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-lg font-semibold text-foreground">Record not found</h2>
                <Button variant="outline" onClick={onClose}>
                    Close Panel
                </Button>
            </div>
        );
    }

    const handleDelete = async () => {
        try {
            await deleteAR.mutateAsync(arId);
            toast.success("Record deleted successfully");
            onClose();
        } catch (error) {
            toast.error("Failed to delete record");
            console.error(error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'PARTIAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'OVERDUE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return <CheckCircle2 className="w-3 h-3 mr-1" />;
            case 'PARTIAL': return <Clock className="w-3 h-3 mr-1" />;
            case 'OVERDUE': return <AlertCircle className="w-3 h-3 mr-1" />;
            case 'PENDING': return <Clock className="w-3 h-3 mr-1" />;
            default: return <XCircle className="w-3 h-3 mr-1" />;
        }
    };

    const progress = (ar.montoPagado / ar.monto) * 100;

    const handlePayment = async () => {
        if (!ar || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (amount > Number(ar.montoRestante || 0)) {
            toast.error('Amount cannot exceed remaining debt');
            return;
        }

        try {
            await createPayment.mutateAsync({
                accountReceivableId: ar.id,
                monto: amount,
                fechaPago: new Date(paymentDate).toISOString(),
                formaPago: paymentMethod,
                referencia: paymentReference || undefined,
                notas: 'Payment registered via AR Panel'
            });

            toast.success('Payment registered successfully');
            setIsPaymentDialogOpen(false);
            setPaymentAmount('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setPaymentMethod('TRANSFER');
            setPaymentReference('');
        } catch (error: unknown) {
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            toast.error(errorMessage || 'Failed to register payment');
        }
    };

    // Calculate legacy payments (only for date view, not client view)
    const paymentsForLegacy = viewMode === 'date' ? paymentsByAR : [];
    const totalRegistered = paymentsForLegacy?.reduce((sum: number, p: typeof paymentsForLegacy[0]) => sum + Number(p.monto || p.amount || 0), 0) || 0;
    const unregisteredAmount = Number(ar.montoPagado || 0) - totalRegistered;
    const hasLegacyPayments = viewMode === 'date' && unregisteredAmount > 0.01;

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="flex-none px-6 py-5 border-b bg-muted/30">
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-foreground leading-snug">
                                {ar.concepto}
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`${getStatusColor(ar.status)} text-xs px-2 py-0.5`}>
                            {getStatusIcon(ar.status)}
                            {ar.status}
                        </Badge>
                    </div>

                    {/* Client Info */}
                    {ar.client && (
                        <div className="flex items-center gap-3 pt-2">
                            <div className="p-1.5 bg-muted rounded-md">
                                <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {ar.client.nombre}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Client
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Financial Metrics */}
                <FinancialMetrics
                    total={ar.monto}
                    paid={ar.montoPagado}
                    remaining={ar.montoRestante}
                    progress={progress}
                    title="Financials"
                />

                {/* Payment History */}
                <Card className="border">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                Payment History
                            </CardTitle>
                            <div className="flex gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        await queryClient.invalidateQueries({ queryKey: ["payment-complements"] });
                                        await queryClient.invalidateQueries({ queryKey: ["accounts-receivable", arId] });
                                        if (ar?.client?.id) {
                                            await queryClient.invalidateQueries({ queryKey: ["payment-complements", "client", ar.client.id] });
                                        }
                                        await queryClient.refetchQueries({ queryKey: ["payment-complements"] });
                                    }}
                                    className="h-7 px-2 text-xs"
                                    title="Refrescar datos"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant={viewMode === 'date' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('date')}
                                    className="h-7 px-3 text-xs"
                                >
                                    <Calendar className="w-3 h-3 mr-1.5" />
                                    By Date
                                </Button>
                                <Button
                                    variant={viewMode === 'client' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('client')}
                                    className="h-7 px-3 text-xs"
                                >
                                    <User className="w-3 h-3 mr-1.5" />
                                    By Client
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {isLoadingPayments ? (
                            <div className="flex justify-center py-8">
                                <Loader size="sm" text="Loading history..." />
                            </div>
                        ) : (
                            <PaymentHistoryTable
                                payments={payments || []}
                                groupBy={viewMode === 'client' ? 'entity' : viewMode}
                                entityName={ar.client?.nombre}
                            />
                        )}

                        {/* Legacy Payments */}
                        {hasLegacyPayments && (
                            <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        <div>
                                            <p className="text-xs font-medium text-foreground">
                                                {unregisteredAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Previous / Manual Records
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        Legacy
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Details */}
                <Card className="border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-3">
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2.5">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Due Date</span>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                                {formatDate(ar.fechaVencimiento)}
                            </span>
                        </div>

                        {ar.project && (
                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2.5">
                                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Project</span>
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    {ar.project.name}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Footer Actions */}
            <div className="flex-none px-6 py-4 border-t bg-muted/30 space-y-2.5">
                {ar.status !== 'PAID' && ar.status !== 'CANCELLED' && (
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-9 text-sm font-medium"
                        onClick={() => {
                            setPaymentAmount('');
                            setPaymentDate(new Date().toISOString().split('T')[0]);
                            setPaymentMethod('TRANSFER');
                            setPaymentReference('');
                            setIsPaymentDialogOpen(true);
                        }}
                    >
                        Register Payment
                    </Button>
                )}

                {['SUPERADMIN', 'CEO', 'CFO'].includes((user?.role || '').toUpperCase()) && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 h-9 text-sm"
                            onClick={() => setIsEditOpen(true)}
                        >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-9 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
                            onClick={() => setIsDeleteOpen(true)}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-base">Register Payment</DialogTitle>
                        <DialogDescription className="text-sm">
                            Enter the payment amount to register.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label htmlFor="amount" className="text-sm font-medium">
                                    Payment Amount
                                </label>
                                <input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="0.00"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Remaining: {ar.montoRestante.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="paymentDate" className="text-sm font-medium">
                                    Payment Date *
                                </label>
                                <DatePicker
                                    date={paymentDate ? new Date(paymentDate) : undefined}
                                    onDateChange={(date) => {
                                        setPaymentDate(date ? date.toISOString().split('T')[0] : '');
                                    }}
                                    placeholder="Select payment date"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paymentMethod" className="text-sm font-medium">
                                    Payment Method *
                                </Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger id="paymentMethod" className="h-9">
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TRANSFER">Transfer (SPEI)</SelectItem>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CHECK">Check</SelectItem>
                                        <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                                        <SelectItem value="WIRE">Wire Transfer</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paymentReference" className="text-sm font-medium">
                                    Reference (Optional)
                                </Label>
                                <input
                                    id="paymentReference"
                                    type="text"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="e.g. SPEI tracking key, check number, etc."
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="h-9 text-sm">
                                Cancel
                            </Button>
                            <Button type="submit" className="h-9 text-sm" disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>
                                Confirm Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-base">Edit Account Receivable</DialogTitle>
                    </DialogHeader>
                    <ARForm
                        accountReceivable={ar}
                        onSuccess={() => setIsEditOpen(false)}
                        onCancel={() => setIsEditOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
