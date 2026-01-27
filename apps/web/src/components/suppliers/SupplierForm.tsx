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
import { Supplier } from "@/hooks/useSuppliers";
import { useEffect } from "react";

const supplierSchema = z.object({
    nombre: z.string().min(2, "Name must be at least 2 characters"),
    rfc: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    countryCode: z.string().optional(),
    telefono: z.string().optional(),
    contacto: z.string().optional(),
    datosBancarios: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
    initialData?: Supplier;
    onSubmit: (data: SupplierFormValues) => void;
    isLoading?: boolean;
    onCancel?: () => void;
}

export function SupplierForm({ initialData, onSubmit, isLoading, onCancel }: SupplierFormProps) {
    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            nombre: initialData?.nombre || "",
            rfc: initialData?.rfc || "",
            email: initialData?.email || "",
            countryCode: initialData?.countryCode || "52",
            telefono: initialData?.telefono || "",
            contacto: initialData?.contacto || "",
            datosBancarios: initialData?.datosBancarios || "",
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                nombre: initialData.nombre,
                rfc: initialData.rfc || "",
                email: initialData.email || "",
                countryCode: initialData.countryCode || "52",
                telefono: initialData.telefono || "",
                contacto: initialData.contacto || "",
                datosBancarios: initialData.datosBancarios || "",
            });
        }
    }, [initialData, form]);

    const handleSubmit = (data: SupplierFormValues) => {
        // Transform camelCase to snake_case for API
        const apiData = {
            nombre: data.nombre,
            rfc: data.rfc === "" ? undefined : data.rfc,
            email: data.email === "" ? undefined : data.email,
            country_code: data.countryCode === "" ? undefined : data.countryCode, // camelCase → snake_case
            telefono: data.telefono === "" ? undefined : data.telefono,
            contacto: data.contacto === "" ? undefined : data.contacto,
            datos_bancarios: data.datosBancarios === "" ? undefined : data.datosBancarios, // camelCase → snake_case
        };
        onSubmit(apiData as any);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Supplier Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter supplier name" {...field} />
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
                                <Input type="email" placeholder="supplier@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Country Code</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Code" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="52">🇲🇽 +52 (México)</SelectItem>
                                        <SelectItem value="1">🇺🇸 +1 (USA)</SelectItem>
                                        <SelectItem value="34">🇪🇸 +34 (España)</SelectItem>
                                        <SelectItem value="54">🇦🇷 +54 (Argentina)</SelectItem>
                                        <SelectItem value="56">🇨🇱 +56 (Chile)</SelectItem>
                                        <SelectItem value="57">🇨🇴 +57 (Colombia)</SelectItem>
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
                                    <Input placeholder="Phone number (without country code)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="datosBancarios"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bank Details</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Bank name, Account number, CLABE, etc."
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
                        {isLoading ? "Saving..." : initialData ? "Update Supplier" : "Create Supplier"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
