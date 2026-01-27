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
import { Prospect, ProspectStatus } from "@/hooks/useProspects";
import { useUsers } from "@/hooks/useUsers";
import { useEffect } from "react";
// import { Slider } from "@/components/ui/slider"; // TODO: Add slider component if needed

const prospectSchema = z.object({
    nombre: z.string().min(2, "Name must be at least 2 characters"),
    rfc: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    telefono: z.string().optional(),
    country_code: z.string().optional(),
    contacto: z.string().optional(),
    direccion: z.string().optional(),
    status: z.nativeEnum(ProspectStatus).optional(),
    source: z.string().optional(),
    estimated_value: z.number().min(0).optional(),
    probability: z.number().min(0).max(100).optional(),
    expected_close_date: z.string().optional(),
    notes: z.string().optional(),
    assigned_to_id: z.string().optional(),
});

// Common country codes for Latin America
const COUNTRY_CODES = [
    { value: "52", label: "🇲🇽 México (+52)" },
    { value: "1", label: "🇺🇸 USA/Canadá (+1)" },
    { value: "54", label: "🇦🇷 Argentina (+54)" },
    { value: "55", label: "🇧🇷 Brasil (+55)" },
    { value: "56", label: "🇨🇱 Chile (+56)" },
    { value: "57", label: "🇨🇴 Colombia (+57)" },
    { value: "593", label: "🇪🇨 Ecuador (+593)" },
    { value: "34", label: "🇪🇸 España (+34)" },
    { value: "502", label: "🇬🇹 Guatemala (+502)" },
    { value: "504", label: "🇭🇳 Honduras (+504)" },
    { value: "51", label: "🇵🇪 Perú (+51)" },
    { value: "598", label: "🇺🇾 Uruguay (+598)" },
    { value: "58", label: "🇻🇪 Venezuela (+58)" },
];

const PROSPECT_SOURCES = [
    { value: "Referral", label: "Referral" },
    { value: "Website", label: "Website" },
    { value: "Cold Call", label: "Cold Call" },
    { value: "Email Marketing", label: "Email Marketing" },
    { value: "Evento", label: "Evento" },
    { value: "Redes Sociales", label: "Redes Sociales" },
    { value: "Otro", label: "Otro" },
];

type ProspectFormValues = z.infer<typeof prospectSchema>;

interface ProspectFormProps {
    initialData?: Prospect;
    onSubmit: (data: ProspectFormValues) => void;
    isLoading?: boolean;
    onCancel?: () => void;
}

export function ProspectForm({ initialData, onSubmit, isLoading, onCancel }: ProspectFormProps) {
    const { data: usersData } = useUsers();
    const allUsers = Array.isArray(usersData)
        ? usersData
        : (usersData && typeof usersData === 'object' && 'data' in usersData && Array.isArray((usersData as { data: unknown }).data))
            ? (usersData as { data: any[] }).data
            : [];

    const form = useForm<ProspectFormValues>({
        resolver: zodResolver(prospectSchema),
        defaultValues: {
            nombre: initialData?.nombre || "",
            rfc: initialData?.rfc || "",
            email: initialData?.email || "",
            telefono: initialData?.telefono || "",
            country_code: initialData?.country_code || "52",
            contacto: initialData?.contacto || "",
            direccion: initialData?.direccion || "",
            status: initialData?.status || ProspectStatus.NEW,
            source: initialData?.source || "",
            estimated_value: initialData?.estimated_value ? Number(initialData.estimated_value) : undefined,
            probability: initialData?.probability || 0,
            expected_close_date: initialData?.expected_close_date || "",
            notes: initialData?.notes || "",
            assigned_to_id: initialData?.assigned_to_id || "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                nombre: initialData.nombre,
                rfc: initialData.rfc || "",
                email: initialData.email || "",
                telefono: initialData.telefono || "",
                country_code: initialData.country_code || "52",
                contacto: initialData.contacto || "",
                direccion: initialData.direccion || "",
                status: initialData.status || ProspectStatus.NEW,
                source: initialData.source || "",
                estimated_value: initialData.estimated_value ? Number(initialData.estimated_value) : undefined,
                probability: initialData.probability || 0,
                expected_close_date: initialData.expected_close_date || "",
                notes: initialData.notes || "",
                assigned_to_id: initialData.assigned_to_id || "",
            });
        }
    }, [initialData, form]);

    const handleSubmit = (data: ProspectFormValues) => {
        const cleanedData = {
            ...data,
            rfc: data.rfc === "" ? undefined : data.rfc,
            email: data.email === "" ? undefined : data.email,
            telefono: data.telefono === "" ? undefined : data.telefono,
            contacto: data.contacto === "" ? undefined : data.contacto,
            direccion: data.direccion === "" ? undefined : data.direccion,
            source: data.source === "" ? undefined : data.source,
            assigned_to_id: data.assigned_to_id === "" ? undefined : data.assigned_to_id,
            expected_close_date: data.expected_close_date === "" ? undefined : data.expected_close_date,
        };
        onSubmit(cleanedData);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Prospecto *</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter prospect name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="rfc"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>RFC / Tax ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tax ID" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="contacto"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contact Person</FormLabel>
                                <FormControl>
                                    <Input placeholder="Contact name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="prospect@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="country_code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Country</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select country" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {COUNTRY_CODES.map((country) => (
                                            <SelectItem key={country.value} value={country.value}>
                                                {country.label}
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
                        name="telefono"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 5512345678" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                                <Input placeholder="Address" {...field} />
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
                                <FormLabel>Estado</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.values(ProspectStatus).map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
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
                        name="source"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Origen</FormLabel>
                                <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Sin origen</SelectItem>
                                        {PROSPECT_SOURCES.map((source) => (
                                            <SelectItem key={source.value} value={source.value}>
                                                {source.label}
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
                        name="estimated_value"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valor Estimado</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="probability"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Probabilidad (%)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                                        value={field.value || 0}
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
                        name="expected_close_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha Esperada de Cierre</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="assigned_to_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Asignado a</FormLabel>
                                <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Sin asignar</SelectItem>
                                        {allUsers.map((user: any) => (
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

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Additional notes..."
                                    className="min-h-[100px]"
                                    {...field}
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
                        {isLoading ? "Saving..." : initialData ? "Update Prospect" : "Create Prospect"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

