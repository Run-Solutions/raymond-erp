"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCategories, AccountPayable, useCreateAccountPayable, useUpdateAccountPayable } from "@/hooks/useFinance";
import { DatePicker } from "@/components/ui/date-picker";

const apSchema = z.object({
    concepto: z.string().min(3, "Concept must be at least 3 characters"),
    supplierId: z.string().optional(),
    categoryId: z.string().min(1, "Category is required"),
    monto: z.string().min(1, "Amount is required"),
    fechaVencimiento: z.string().min(1, "Due date is required"),
    status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]).default("PENDING"),
    notas: z.string().optional(),
});

type APFormData = z.infer<typeof apSchema>;

interface APFormProps {
    accountPayable?: AccountPayable;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function APForm({ accountPayable, onSuccess, onCancel }: APFormProps) {
    const { data: suppliersData } = useSuppliers({ limit: 100 });
    const { data: categories } = useCategories();

    // Handle different response structures from useSuppliers
    const suppliers = React.useMemo(() => {
        if (!suppliersData) return [];
        if (Array.isArray(suppliersData)) return suppliersData;
        if ('data' in suppliersData && Array.isArray(suppliersData.data)) return suppliersData.data;
        return [];
    }, [suppliersData]);

    // Use the hooks from useFinance.ts which include data transformation
    const createMutation = useCreateAccountPayable();
    const updateMutation = useUpdateAccountPayable();

    const form = useForm({
        resolver: zodResolver(apSchema),
        defaultValues: {
            concepto: accountPayable?.concepto || "",
            supplierId: accountPayable?.supplier?.id || accountPayable?.supplierId || "", // Handle both object and ID if present
            categoryId: accountPayable?.categoryId || "",
            monto: accountPayable?.monto?.toString() || "",
            fechaVencimiento: accountPayable?.fechaVencimiento
                ? new Date(accountPayable.fechaVencimiento).toISOString().split('T')[0]
                : "",
            status: accountPayable?.status || "PENDING",
            notas: accountPayable?.notas || "",
        },
    });

    const onSubmit = async (data: APFormData) => {
        try {
            const payload = {
                ...data,
                monto: parseFloat(data.monto),
                fechaVencimiento: new Date(data.fechaVencimiento).toISOString(),
                supplierId: data.supplierId || undefined,
                notas: data.notas || undefined,
            };

            if (accountPayable?.id) {
                await updateMutation.mutateAsync({ id: accountPayable.id, data: payload });
                toast.success("Account payable updated successfully");
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("Account payable created successfully");
            }

            onSuccess?.();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save account payable");
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="concepto"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Concept *</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter concept description..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Supplier (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {suppliers.map((supplier: any) => (
                                            <SelectItem key={supplier.id} value={supplier.id}>
                                                {supplier.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Array.isArray(categories) && categories.map((category: any) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                <div className="flex items-center gap-2">
                                                    {category.color && (
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: category.color }}
                                                        />
                                                    )}
                                                    {category.nombre}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="monto"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount (MXN) *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="fechaVencimiento"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Due Date *</FormLabel>
                                <FormControl>
                                    <DatePicker
                                        date={field.value ? new Date(field.value) : undefined}
                                        onDateChange={(date) => {
                                            field.onChange(date ? date.toISOString().split('T')[0] : '');
                                        }}
                                        placeholder="Select due date"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="PARTIAL">Partial</SelectItem>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notas"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Additional notes..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-3 pt-4">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {accountPayable ? "Update Account" : "Create Account"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
