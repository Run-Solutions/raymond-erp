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
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { AccountReceivable, useCreateAccountReceivable, useUpdateAccountReceivable } from "@/hooks/useFinance";
import { DatePicker } from "@/components/ui/date-picker";

const arSchema = z.object({
    concepto: z.string().min(3, "Concept must be at least 3 characters"),
    projectId: z.string().min(1, "Project is required"),
    clientId: z.string().optional(),
    monto: z.string().min(1, "Amount is required"),
    fechaVencimiento: z.string().min(1, "Due date is required"),
    status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]).default("PENDING"),
    notas: z.string().optional(),
});

type ARFormData = z.infer<typeof arSchema>;

interface ARFormProps {
    accountReceivable?: AccountReceivable & { projectId?: string; clientId?: string; notas?: string };
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ARForm({ accountReceivable, onSuccess, onCancel }: ARFormProps) {
    const { data: projects } = useProjects();
    const { data: clients } = useClients();

    // Use the hooks from useFinance.ts which include data transformation
    const createMutation = useCreateAccountReceivable();
    const updateMutation = useUpdateAccountReceivable();

    const form = useForm({
        resolver: zodResolver(arSchema),
        defaultValues: {
            concepto: accountReceivable?.concepto || "",
            projectId: accountReceivable?.projectId || "",
            clientId: accountReceivable?.clientId || "",
            monto: accountReceivable?.monto?.toString() || "",
            fechaVencimiento: accountReceivable?.fechaVencimiento
                ? new Date(accountReceivable.fechaVencimiento).toISOString().split('T')[0]
                : "",
            status: accountReceivable?.status || "PENDING",
            notas: accountReceivable?.notas || "",
        },
    });

    const onSubmit = async (data: ARFormData) => {
        try {
            const payload = {
                ...data,
                monto: parseFloat(data.monto),
                fechaVencimiento: new Date(data.fechaVencimiento).toISOString(),
                clientId: data.clientId || undefined,
                notas: data.notas || undefined,
            };

            if (accountReceivable?.id) {
                await updateMutation.mutateAsync({ id: accountReceivable.id, data: payload });
                toast.success("Account receivable updated successfully");
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("Account receivable created successfully");
            }

            onSuccess?.();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save account receivable");
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
                        name="projectId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Project *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select project" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {projects?.data && Array.isArray(projects.data) && projects.data.map((project: any) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
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
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Client (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select client" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {clients?.data && Array.isArray(clients.data) && clients.data.map((client: any) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.nombre}
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
                        {accountReceivable ? "Update Account" : "Create Account"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
