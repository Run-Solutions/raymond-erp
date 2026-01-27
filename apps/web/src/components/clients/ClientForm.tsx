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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Client } from "@/hooks/useClients";
import { useEffect } from "react";

const clientSchema = z.object({
    nombre: z.string().min(2, "Name must be at least 2 characters"),
    rfc: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    telefono: z.string().optional(),
    country_code: z.string().optional(),
    contacto: z.string().optional(),
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

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
    initialData?: Client;
    onSubmit: (data: ClientFormValues) => void;
    isLoading?: boolean;
    onCancel?: () => void;
}

export function ClientForm({ initialData, onSubmit, isLoading, onCancel }: ClientFormProps) {
    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            nombre: initialData?.nombre || "",
            rfc: initialData?.rfc || "",
            email: initialData?.email || "",
            telefono: initialData?.telefono || "",
            country_code: initialData?.country_code || "52",
            contacto: initialData?.contacto || "",
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                nombre: initialData.nombre,
                rfc: initialData.rfc || "",
                email: initialData.email || "",
                telefono: initialData.telefono || "",
                country_code: initialData.country_code || "52",
                contacto: initialData.contacto || "",
            });
        }
    }, [initialData, form]);

    const handleSubmit = (data: ClientFormValues) => {
        // Clean empty strings to undefined/null for API
        const cleanedData = {
            ...data,
            rfc: data.rfc === "" ? undefined : data.rfc,
            email: data.email === "" ? undefined : data.email,
            telefono: data.telefono === "" ? undefined : data.telefono,
            contacto: data.contacto === "" ? undefined : data.contacto,
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
                            <FormLabel>Client Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter client name" {...field} />
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
                                <Input type="email" placeholder="client@example.com" {...field} />
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

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : initialData ? "Update Client" : "Create Client"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
