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
import { Cliente, CreateClienteDto } from "@/services/taller-r1/clientes.service";
import { useEffect } from "react";

const clientSchema = z.object({
    nombre_cliente: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    razon_social: z.string().optional(),
    rfc: z.string().optional(),
    persona_contacto: z.string().optional(),
    telefono: z.string().optional(),
    calle: z.string().optional(),
    numero_calle: z.string().optional(),
    ciudad: z.string().optional(),
    cp: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
    initialData?: Cliente | null;
    onSubmit: (data: ClientFormValues) => void;
    isLoading?: boolean;
    onCancel?: () => void;
}

export function ClienteForm({ initialData, onSubmit, isLoading, onCancel }: ClientFormProps) {
    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            nombre_cliente: initialData?.nombre_cliente || "",
            razon_social: initialData?.razon_social || "",
            rfc: initialData?.rfc || "",
            persona_contacto: initialData?.persona_contacto || "",
            telefono: initialData?.telefono?.toString() || "",
            calle: initialData?.calle || "",
            numero_calle: initialData?.numero_calle || "",
            ciudad: initialData?.ciudad || "",
            cp: initialData?.cp || "",
        },
    });

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                nombre_cliente: initialData.nombre_cliente,
                razon_social: initialData.razon_social || "",
                rfc: initialData.rfc || "",
                persona_contacto: initialData.persona_contacto || "",
                telefono: initialData.telefono?.toString() || "",
                calle: initialData.calle || "",
                numero_calle: initialData.numero_calle || "",
                ciudad: initialData.ciudad || "",
                cp: initialData.cp || "",
            });
        }
    }, [initialData, form]);

    const handleSubmit = (data: ClientFormValues) => {
        const cleanedData = {
            ...data,
            telefono: data.telefono ? Number(data.telefono) : undefined,
        };
        onSubmit(cleanedData as any);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 text-gray-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="nombre_cliente"
                        render={({ field }) => (
                            <FormItem className="col-span-1 md:col-span-2">
                                <FormLabel>Nombre Comercial</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Aceros Nacionales" {...field} className="focus:ring-red-500" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="razon_social"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Razón Social</FormLabel>
                                <FormControl>
                                    <Input placeholder="Razón Fiscal" {...field} className="focus:ring-red-500" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="rfc"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>RFC / Tax ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="RFC" {...field} className="uppercase focus:ring-red-500" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="persona_contacto"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Persona de Contacto</FormLabel>
                                <FormControl>
                                    <Input placeholder="Nombre del contacto" {...field} className="focus:ring-red-500" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="telefono"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. 5512345678" {...field} className="focus:ring-red-500" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Dirección</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="calle"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                    <FormLabel>Calle</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Calle o Avenida" {...field} className="focus:ring-red-500" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="numero_calle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Num Ext/Int" {...field} className="focus:ring-red-500" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ciudad"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                    <FormLabel>Ciudad</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ciudad o Municipio" {...field} className="focus:ring-red-500" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código Postal</FormLabel>
                                    <FormControl>
                                        <Input placeholder="C.P." {...field} className="focus:ring-red-500" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-6">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} className="bg-white text-black border-gray-200 hover:bg-gray-100 hover:text-black shadow-sm font-semibold">
                            Cancelar
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
                        {isLoading ? "Guardando..." : initialData ? "Actualizar Cliente" : "Crear Cliente"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
