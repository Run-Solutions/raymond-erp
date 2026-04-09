'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Cliente } from "@/services/taller-r1/clientes.service";
import { useEffect } from "react";
import { Building2, User, Phone, MapPin, Hash, FileText, Loader2, Check } from "lucide-react";

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

function FieldWrapper({ label, icon: Icon, error, children }: {
    label: string;
    icon: React.ElementType;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <Icon className="w-3 h-3" />
                {label}
            </label>
            {children}
            {error && (
                <p className="text-[10px] font-bold text-rose-500 ml-1">{error}</p>
            )}
        </div>
    );
}

export function ClienteForm({ initialData, onSubmit, isLoading, onCancel }: ClientFormProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ClientFormValues>({
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

    useEffect(() => {
        if (initialData) {
            reset({
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
    }, [initialData, reset]);

    const handleFormSubmit = (data: ClientFormValues) => {
        const cleanedData = {
            ...data,
            rfc: data.rfc?.toUpperCase() || undefined,
            telefono: data.telefono ? Number(data.telefono) : undefined,
        };
        onSubmit(cleanedData as any);
    };

    const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-300 text-sm";
    const inputErrorClass = "w-full px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all outline-none font-medium text-slate-800 placeholder:text-rose-300 text-sm";

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">

            {/* Sección: Identificación */}
            <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Identificación
                </p>

                <FieldWrapper label="Nombre Comercial *" icon={Building2} error={errors.nombre_cliente?.message}>
                    <input
                        {...register("nombre_cliente")}
                        placeholder="Ej. Aceros Nacionales S.A."
                        className={errors.nombre_cliente ? inputErrorClass : inputClass}
                    />
                </FieldWrapper>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldWrapper label="Razón Social" icon={FileText} error={errors.razon_social?.message}>
                        <input
                            {...register("razon_social")}
                            placeholder="Razón Fiscal"
                            className={errors.razon_social ? inputErrorClass : inputClass}
                        />
                    </FieldWrapper>

                    <FieldWrapper label="RFC / Tax ID" icon={Hash} error={errors.rfc?.message}>
                        <input
                            {...register("rfc")}
                            placeholder="XAXX010101000"
                            className={`${errors.rfc ? inputErrorClass : inputClass} uppercase`}
                            maxLength={13}
                        />
                    </FieldWrapper>
                </div>
            </div>

            {/* Sección: Contacto */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" /> Contacto
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldWrapper label="Persona de Contacto" icon={User} error={errors.persona_contacto?.message}>
                        <input
                            {...register("persona_contacto")}
                            placeholder="Nombre del contacto"
                            className={errors.persona_contacto ? inputErrorClass : inputClass}
                        />
                    </FieldWrapper>

                    <FieldWrapper label="Teléfono" icon={Phone} error={errors.telefono?.message}>
                        <input
                            {...register("telefono")}
                            placeholder="Ej. 5512345678"
                            type="tel"
                            className={errors.telefono ? inputErrorClass : inputClass}
                        />
                    </FieldWrapper>
                </div>
            </div>

            {/* Sección: Dirección */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Dirección <span className="text-slate-300 font-normal normal-case tracking-normal">(opcional)</span>
                </p>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <FieldWrapper label="Calle" icon={MapPin} error={errors.calle?.message}>
                            <input
                                {...register("calle")}
                                placeholder="Calle o Avenida"
                                className={errors.calle ? inputErrorClass : inputClass}
                            />
                        </FieldWrapper>
                    </div>
                    <FieldWrapper label="Número" icon={Hash} error={errors.numero_calle?.message}>
                        <input
                            {...register("numero_calle")}
                            placeholder="Ext/Int"
                            className={errors.numero_calle ? inputErrorClass : inputClass}
                        />
                    </FieldWrapper>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <FieldWrapper label="Ciudad" icon={MapPin} error={errors.ciudad?.message}>
                            <input
                                {...register("ciudad")}
                                placeholder="Ciudad o Municipio"
                                className={errors.ciudad ? inputErrorClass : inputClass}
                            />
                        </FieldWrapper>
                    </div>
                    <FieldWrapper label="C.P." icon={Hash} error={errors.cp?.message}>
                        <input
                            {...register("cp")}
                            placeholder="00000"
                            className={errors.cp ? inputErrorClass : inputClass}
                            maxLength={6}
                        />
                    </FieldWrapper>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-red-200 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {isLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
                        : <><Check className="w-3.5 h-3.5" /> {initialData ? "Actualizar Cliente" : "Crear Cliente"}</>
                    }
                </button>
            </div>
        </form>
    );
}
