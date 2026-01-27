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
import { Sprint } from "@/types";
import { useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { MultiSelect } from "@/components/ui/multi-select";
import { User as UserIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

const sprintSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    projectId: z.string().min(1, "Project is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    goal: z.string().optional(),
    memberIds: z.array(z.string()).optional(),
}).refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
}, {
    message: "End date must be after start date",
    path: ["endDate"],
});

type SprintFormValues = z.infer<typeof sprintSchema>;

interface SprintFormProps {
    initialData?: Sprint;
    onSubmit: (data: SprintFormValues) => void;
    isLoading?: boolean;
    onCancel?: () => void;
    defaultProjectId?: string;
}

export function SprintForm({ initialData, onSubmit, isLoading, onCancel, defaultProjectId }: SprintFormProps) {
    const { data: projectsData } = useProjects({ limit: 100 });
    const projects = projectsData?.data || [];
    const { data: users } = useUsers();

    // Filter users for Sprint Members (Operators and Developers)
    const sprintMemberOptions = users
        ?.filter((user: any) => {
            const roleName = user.role?.name?.toUpperCase()?.trim();
            return ['DEVELOPER', 'OPERARIO', 'OPERATOR', 'DEV'].includes(roleName);
        })
        .map((user: any) => ({
            label: `${user.firstName} ${user.lastName} (${user.role?.name})`,
            value: user.id,
            icon: UserIcon,
        })) || [];

    const form = useForm<SprintFormValues>({
        resolver: zodResolver(sprintSchema),
        defaultValues: {
            name: initialData?.name || "",
            projectId: initialData?.projectId || defaultProjectId || "",
            startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
            endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
            goal: initialData?.goal || "",
            memberIds: initialData?.members?.map(m => m.id) || [],
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                projectId: initialData.projectId,
                startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
                endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
                goal: initialData.goal || "",
                memberIds: initialData.members?.map(m => m.id) || [],
            });
        }
    }, [initialData, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
                // Transform camelCase to snake_case for API
                const apiData = {
                    name: data.name,
                    project_id: data.projectId,  // camelCase → snake_case
                    start_date: data.startDate,   // camelCase → snake_case
                    end_date: data.endDate,       // camelCase → snake_case
                    goal: data.goal === "" ? undefined : data.goal,
                    memberIds: data.memberIds,
                };
                onSubmit(apiData as any);
            })} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sprint Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Sprint 1, Q1 2024 Sprint" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={!!defaultProjectId || !!initialData}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select project" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {projects.map((project: any) => (
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

                <div className="grid grid-cols-2 gap-4">
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

                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Date</FormLabel>
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
                </div>

                <FormField
                    control={form.control}
                    name="goal"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sprint Goal (Optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="What is the main objective of this sprint?"
                                    {...field}
                                    rows={3}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="memberIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sprint Members (Developers/Operators)</FormLabel>
                            <FormControl>
                                <MultiSelect
                                    options={sprintMemberOptions}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Select sprint members..."
                                    className="w-full"
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
                        {isLoading ? "Saving..." : initialData ? "Update Sprint" : "Create Sprint"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
