'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Prospect } from '@/hooks/useProspects';
import { useConvertProspectToClient } from '@/hooks/useProspects';
import { toast } from 'sonner';
import { CheckCircle2, Building2, Mail, Phone, User, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const convertSchema = z.object({
    rfc: z.string().optional(),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    country_code: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    contacto: z.string().optional(),
    is_active: z.boolean().optional(),
});

type ConvertFormValues = z.infer<typeof convertSchema>;

interface ProspectConversionDialogProps {
    prospect: Prospect;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (clientId: string) => void;
}

export function ProspectConversionDialog({
    prospect,
    open,
    onOpenChange,
    onSuccess,
}: ProspectConversionDialogProps) {
    const convertProspect = useConvertProspectToClient();
    const [isPreviewMode, setIsPreviewMode] = useState(true);

    const form = useForm<ConvertFormValues>({
        resolver: zodResolver(convertSchema),
        defaultValues: {
            rfc: prospect.rfc || '',
            direccion: prospect.direccion || '',
            telefono: prospect.telefono || '',
            country_code: prospect.country_code || '52',
            email: prospect.email || '',
            contacto: prospect.contacto || '',
            is_active: true,
        },
    });

    const handleConvert = async (data: ConvertFormValues) => {
        try {
            const cleanedData = {
                ...data,
                rfc: data.rfc === '' ? undefined : data.rfc,
                direccion: data.direccion === '' ? undefined : data.direccion,
                telefono: data.telefono === '' ? undefined : data.telefono,
                email: data.email === '' ? undefined : data.email,
                contacto: data.contacto === '' ? undefined : data.contacto,
            };

            const response = await convertProspect.mutateAsync({
                id: prospect.id,
                data: cleanedData,
            });

            // Extract client ID from response
            const clientId = response?.data?.client?.id || response?.client?.id || response?.data?.id;
            if (clientId) {
                onSuccess(clientId);
            } else {
                toast.success('Prospect converted to client successfully');
                onOpenChange(false);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to convert prospect to client');
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Convertir Prospecto a Cliente
                    </DialogTitle>
                    <DialogDescription>
                        El prospecto "{prospect.nombre}" será convertido en un cliente. Puedes revisar y editar los datos antes de confirmar.
                    </DialogDescription>
                </DialogHeader>

                {isPreviewMode ? (
                    <div className="space-y-4">
                        {/* Preview Card */}
                        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-4 space-y-3">
                                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-3">
                                    Vista Previa de Datos
                                </h4>
                                
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-start gap-3">
                                        <Building2 className="w-4 h-4 text-blue-600 mt-0.5" />
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">Nombre:</span>
                                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{prospect.nombre}</span>
                                        </div>
                                    </div>

                                    {prospect.rfc && (
                                        <div className="flex items-start gap-3">
                                            <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">RFC:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{prospect.rfc}</span>
                                            </div>
                                        </div>
                                    )}

                                    {prospect.email && (
                                        <div className="flex items-start gap-3">
                                            <Mail className="w-4 h-4 text-blue-600 mt-0.5" />
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{prospect.email}</span>
                                            </div>
                                        </div>
                                    )}

                                    {prospect.telefono && (
                                        <div className="flex items-start gap-3">
                                            <Phone className="w-4 h-4 text-blue-600 mt-0.5" />
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Teléfono:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{prospect.telefono}</span>
                                            </div>
                                        </div>
                                    )}

                                    {prospect.contacto && (
                                        <div className="flex items-start gap-3">
                                            <User className="w-4 h-4 text-blue-600 mt-0.5" />
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Contacto:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{prospect.contacto}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setIsPreviewMode(false)}
                            >
                                Editar y Convertir
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleConvert)} className="space-y-4">
                            <div className="space-y-4">
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
                                        name="country_code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="52" {...field} />
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
                                                    <Input placeholder="Phone number" {...field} />
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
                                                <Input type="email" placeholder="email@example.com" {...field} />
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
                                            <FormLabel>Contacto</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Contact person" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsPreviewMode(true)}
                                >
                                    Volver
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={convertProspect.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {convertProspect.isPending ? "Convirtiendo..." : "Confirmar Conversión"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

