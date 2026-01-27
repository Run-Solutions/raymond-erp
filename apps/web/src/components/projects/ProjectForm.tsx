import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Project } from "@/types";
import { useEffect, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useUsers } from "@/hooks/useUsers";
import { usePhases } from "@/hooks/usePhases";
import { MultiSelect } from "@/components/ui/multi-select";
import { User as UserIcon, Settings } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { PhasesManager } from "@/components/phases/PhasesManager";

const projectSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    clientId: z.string().optional(),
    phaseId: z.string().optional(),
    ownerId: z.string().optional(),
    memberIds: z.array(z.string()).optional(),
    amountWithTax: z.string().optional(),
    amountWithoutTax: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
    initialData?: Project & { members?: { id: string }[] };
    onSubmit: (data: ProjectFormValues) => void;
    isLoading?: boolean;
    onCancel?: () => void;
}

export function ProjectForm({ initialData, onSubmit, isLoading, onCancel }: ProjectFormProps) {
    const { data: clientsData } = useClients({ limit: 100 });
    const { data: users } = useUsers();
    const { data: phasesData, refetch: refetchPhases } = usePhases();

    const clients = Array.isArray(clientsData) ? clientsData : (clientsData as any)?.data || [];
    const phases = phasesData?.data || [];

    const [isPhasesManagerOpen, setIsPhasesManagerOpen] = useState(false);

    // Filter users for Team Members (Operators and Developers)
    const teamMemberOptions = users
        ?.filter((user: any) => {
            const roleName = user.role?.name?.toUpperCase()?.trim();
            return ['DEVELOPER', 'OPERARIO'].includes(roleName);
        })
        .map((user: any) => ({
            label: `${user.firstName} ${user.lastName} (${user.role?.name})`,
            value: user.id,
            icon: UserIcon,
        })) || [];

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
            status: (initialData?.status as any) || "ACTIVE",
            startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
            clientId: initialData?.clientId || "",
            phaseId: initialData?.phaseId || "",
            ownerId: initialData?.ownerId || "",
            memberIds: initialData?.members?.map(m => m.id) || [],
            amountWithTax: initialData?.amountWithTax ? String(initialData.amountWithTax) : "",
            amountWithoutTax: initialData?.amountWithoutTax ? String(initialData.amountWithoutTax) : "",
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                description: initialData.description || "",
                status: (initialData.status as any),
                startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
                endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
                clientId: initialData.clientId || "",
                phaseId: initialData.phaseId || "",
                ownerId: initialData.ownerId || "",
                memberIds: initialData.members?.map(m => m.id) || [],
                amountWithTax: initialData.amountWithTax ? String(initialData.amountWithTax) : "",
                amountWithoutTax: initialData.amountWithoutTax ? String(initialData.amountWithoutTax) : "",
            });
        }
    }, [initialData, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
                // Transform camelCase to snake_case for API
                const apiData = {
                    name: data.name,
                    description: data.description,
                    status: data.status,
                    start_date: data.startDate,
                    endDate: data.endDate === "" ? undefined : data.endDate,
                    client_id: data.clientId === "" ? undefined : data.clientId,
                    phase_id: data.phaseId === "" ? undefined : data.phaseId,
                    owner_id: data.ownerId === "" ? undefined : data.ownerId,
                    memberIds: data.memberIds,
                    amount_with_tax: data.amountWithTax ? parseFloat(data.amountWithTax) : undefined,
                    amount_without_tax: data.amountWithoutTax ? parseFloat(data.amountWithoutTax) : undefined,
                };
                onSubmit(apiData as any);
            })} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter project name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Project description" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                    <DatePicker
                                        date={field.value ? new Date(field.value) : undefined}
                                        onDateChange={(date) => {
                                            field.onChange(date ? date.toISOString().split('T')[0] : '');
                                        }}
                                        placeholder="Select start date"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Client</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select client" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {clients?.map((client: any) => (
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

                    <FormField
                        control={form.control}
                        name="ownerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Project Manager (Owner)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select manager" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {users?.map((user: any) => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.firstName} {user.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="phaseId"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between mb-2">
                                    <FormLabel>Phase (Optional)</FormLabel>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => setIsPhasesManagerOpen(true)}
                                    >
                                        <Settings className="w-3 h-3 mr-1" />
                                        Manage Phases
                                    </Button>
                                </div>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a phase" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {phases.length === 0 ? (
                                            <SelectItem value="no-phases" disabled>
                                                No phases yet - click Manage Phases
                                            </SelectItem>
                                        ) : (
                                            phases.map((phase: any) => (
                                                <SelectItem key={phase.id} value={phase.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: phase.color || '#3B82F6' }}
                                                        />
                                                        {phase.name}
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="amountWithTax"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount (with Tax)</FormLabel>
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
                </div>

                <FormField
                    control={form.control}
                    name="memberIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Team Members (Operators/Developers)</FormLabel>
                            <FormControl>
                                <MultiSelect
                                    options={teamMemberOptions}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Select team members..."
                                    className="w-full"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                                <DatePicker
                                    date={field.value ? new Date(field.value) : undefined}
                                    onDateChange={(date) => {
                                        field.onChange(date ? date.toISOString().split('T')[0] : '');
                                    }}
                                    placeholder="Select end date"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : initialData ? "Update Project" : "Create Project"}
                    </Button>
                </div>
            </form>

            {/* Phases Manager Dialog */}
            <PhasesManager
                open={isPhasesManagerOpen}
                onOpenChange={setIsPhasesManagerOpen}
            />
        </Form>
    );
}
