'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Button from '@/components/ui/button'
import { Upload, X, Palette, RefreshCw, Check } from 'lucide-react'
import { useOrganizationStore } from '@/store/organization.store'
import { toast } from 'sonner'
import Image from 'next/image'
import { applyBrandColors, resetToDefaultColors } from '@/lib/theme-utils'
import SidebarPreview from './SidebarPreview'

export default function BrandingSettings() {
    const { currentOrganization, updateOrganization, refresh } = useOrganizationStore()
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [logoZoom, setLogoZoom] = useState(currentOrganization?.logoZoom || 1.0)
    const [colors, setColors] = useState({
        primary: currentOrganization?.primaryColor || '#2563eb',
        secondary: currentOrganization?.secondaryColor || '#3b82f6',
        accent: currentOrganization?.accentColor || '#60a5fa',
    })
    const [isUploading, setIsUploading] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [hasUnsavedZoom, setHasUnsavedZoom] = useState(false)

    // Update colors and logoZoom when organization changes
    useEffect(() => {
        if (currentOrganization) {
            setColors({
                primary: currentOrganization.primaryColor || '#2563eb',
                secondary: currentOrganization.secondaryColor || '#3b82f6',
                accent: currentOrganization.accentColor || '#60a5fa',
            })
            setLogoZoom(currentOrganization.logoZoom || 1.0)
        }
    }, [currentOrganization])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file size
        if (file.size > 5 * 1024 * 1024) {
            toast.error('El logo no debe superar los 5MB')
            return
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten archivos de imagen')
            return
        }

        const reader = new FileReader()
        reader.onload = async () => {
            const base64 = reader.result as string
            setLogoPreview(base64)

            // Auto-save logo
            setIsUploading(true)
            try {
                const success = await updateOrganization({ logoUrl: base64 })

                if (!success) {
                    throw new Error('Upload failed - returned false')
                }

                await refresh()
                toast.success('¡Logo actualizado! Se muestra en toda la aplicación.', {
                    duration: 3000,
                })
                setLogoPreview(null)
            } catch (error: any) {
                console.error('[BrandingSettings] Error uploading logo:', error)
                const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido'
                toast.error(`Error al actualizar el logo: ${errorMessage}`, {
                    duration: 5000,
                })
                setLogoPreview(null)
            } finally {
                setIsUploading(false)
            }
        }
        reader.onerror = () => {
            toast.error('Error al leer el archivo de imagen')
        }
        reader.readAsDataURL(file)
    }

    const handleColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
        setColors({ ...colors, [colorType]: value })
        setHasUnsavedChanges(true)

        // Preview colors in real-time
        applyBrandColors({
            ...colors,
            [colorType]: value,
        })
    }

    const handleColorSave = async () => {
        setIsUploading(true)

        try {
            const success = await updateOrganization({
                primaryColor: colors.primary,
                secondaryColor: colors.secondary,
                accentColor: colors.accent,
            })

            if (!success) {
                throw new Error('Update failed - returned false')
            }

            await refresh()
            toast.success('¡Colores actualizados! Se aplican a toda la aplicación.', {
                duration: 3000,
            })
            setHasUnsavedChanges(false)

            // Apply colors after successful save
            applyBrandColors(colors)
        } catch (error: any) {
            console.error('[BrandingSettings] Error saving colors:', error)
            const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido'
            toast.error(`Error al actualizar los colores: ${errorMessage}`, {
                duration: 5000,
            })

            // Revert to saved colors on error
            if (currentOrganization) {
                setColors({
                    primary: currentOrganization.primaryColor || '#2563eb',
                    secondary: currentOrganization.secondaryColor || '#3b82f6',
                    accent: currentOrganization.accentColor || '#60a5fa',
                })
                applyBrandColors({
                    primary: currentOrganization.primaryColor,
                    secondary: currentOrganization.secondaryColor,
                    accent: currentOrganization.accentColor,
                })
            }
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemoveLogo = async () => {
        setIsUploading(true)
        try {
            console.log('[BrandingSettings] Removing logo')

            const success = await updateOrganization({ logoUrl: null })

            if (!success) {
                throw new Error('Remove failed - returned false')
            }

            await refresh()
            toast.success('Logo eliminado. Se mostrará el logo de RAYMOND.', {
                duration: 3000,
            })

            console.log('[BrandingSettings] Logo removed successfully')
        } catch (error: any) {
            console.error('[BrandingSettings] Error removing logo:', error)
            const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido'
            toast.error(`Error al eliminar el logo: ${errorMessage}`, {
                duration: 5000,
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleResetColors = async () => {
        setIsUploading(true)
        try {
            console.log('[BrandingSettings] Resetting colors to RAYMOND defaults')

            const success = await updateOrganization({
                primaryColor: null,
                secondaryColor: null,
                accentColor: null,
            })

            if (!success) {
                throw new Error('Reset failed - returned false')
            }

            await refresh()
            resetToDefaultColors()
            setColors({
                primary: '#2563eb',
                secondary: '#3b82f6',
                accent: '#60a5fa',
            })
            setHasUnsavedChanges(false)
            toast.success('¡Colores restablecidos! Volviste a los colores de RAYMOND.', {
                duration: 3000,
            })

            console.log('[BrandingSettings] Colors reset successfully')
        } catch (error: any) {
            console.error('[BrandingSettings] Error resetting colors:', error)
            const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido'
            toast.error(`Error al restablecer los colores: ${errorMessage}`, {
                duration: 5000,
            })
        } finally {
            setIsUploading(false)
        }
    }

    const currentLogo = logoPreview || currentOrganization?.logoUrl

    return (
        <div className="space-y-6">
            {/* Logo Section */}
            <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Logo de la Organización
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Sube el logo de tu empresa. Se mostrará en toda la aplicación.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {currentLogo ? (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                <div className="relative w-32 h-32 rounded-full border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 p-2">
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div
                                            className="relative w-full h-full"
                                            style={{ transform: `scale(${logoZoom})` }}
                                        >
                                            <Image
                                                src={currentLogo}
                                                alt="Logo de la organización"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="logo-upload" className="cursor-pointer">
                                        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                                            <Upload className="w-4 h-4 mr-2" />
                                            Cambiar Logo
                                        </span>
                                        <input
                                            id="logo-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            disabled={isUploading}
                                        />
                                    </label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRemoveLogo}
                                        disabled={isUploading}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Eliminar Logo
                                    </Button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        PNG, JPG o SVG hasta 5MB
                                    </p>
                                </div>
                            </div>

                            {/* Logo Zoom Control */}
                            <div className="max-w-md space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="logo-zoom" className="text-sm font-medium">
                                        Ajustar Zoom del Logo
                                    </Label>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {(logoZoom * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        id="logo-zoom"
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.05"
                                        value={logoZoom}
                                        onChange={(e) => {
                                            setLogoZoom(parseFloat(e.target.value))
                                            setHasUnsavedZoom(true)
                                        }}
                                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        disabled={isUploading}
                                    />
                                    {hasUnsavedZoom && (
                                        <Button
                                            size="sm"
                                            onClick={async () => {
                                                setIsUploading(true)
                                                try {
                                                    const success = await updateOrganization({ logoZoom })
                                                    if (success) {
                                                        await refresh()
                                                        setHasUnsavedZoom(false)
                                                        toast.success('Zoom del logo actualizado')
                                                    }
                                                } catch (error) {
                                                    toast.error('Error al actualizar el zoom')
                                                } finally {
                                                    setIsUploading(false)
                                                }
                                            }}
                                            disabled={isUploading}
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Guardar
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Ajusta el tamaño del logo dentro del círculo (50% - 200%)
                                </p>
                            </div>
                        </div>
                    ) : (
                        <label htmlFor="logo-upload-empty" className="cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-800/50">
                                <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Haz clic para subir el logo de tu empresa
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    PNG, JPG o SVG hasta 5MB
                                </p>
                            </div>
                            <input
                                id="logo-upload-empty"
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={isUploading}
                            />
                        </label>
                    )}
                </div>
            </Card>

            {/* Colors Section */}
            <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Colores de Marca
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Personaliza los colores de la aplicación según tu marca.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Primary Color */}
                        <div>
                            <Label htmlFor="primary-color" className="text-sm font-medium">
                                Color Primario
                            </Label>
                            <div className="flex gap-2 mt-2">
                                <div className="relative">
                                    <input
                                        id="primary-color"
                                        type="color"
                                        value={colors.primary}
                                        onChange={(e) => handleColorChange('primary', e.target.value)}
                                        className="w-14 h-10 rounded-md border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                </div>
                                <Input
                                    type="text"
                                    value={colors.primary}
                                    onChange={(e) => handleColorChange('primary', e.target.value)}
                                    placeholder="#2563eb"
                                    className="flex-1 font-mono text-sm"
                                    disabled={isUploading}
                                />
                            </div>
                        </div>

                        {/* Secondary Color */}
                        <div>
                            <Label htmlFor="secondary-color" className="text-sm font-medium">
                                Color Secundario
                            </Label>
                            <div className="flex gap-2 mt-2">
                                <div className="relative">
                                    <input
                                        id="secondary-color"
                                        type="color"
                                        value={colors.secondary}
                                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                                        className="w-14 h-10 rounded-md border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                </div>
                                <Input
                                    type="text"
                                    value={colors.secondary}
                                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                                    placeholder="#3b82f6"
                                    className="flex-1 font-mono text-sm"
                                    disabled={isUploading}
                                />
                            </div>
                        </div>

                        {/* Accent Color */}
                        <div>
                            <Label htmlFor="accent-color" className="text-sm font-medium">
                                Color de Acento
                            </Label>
                            <div className="flex gap-2 mt-2">
                                <div className="relative">
                                    <input
                                        id="accent-color"
                                        type="color"
                                        value={colors.accent}
                                        onChange={(e) => handleColorChange('accent', e.target.value)}
                                        className="w-14 h-10 rounded-md border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                </div>
                                <Input
                                    type="text"
                                    value={colors.accent}
                                    onChange={(e) => handleColorChange('accent', e.target.value)}
                                    placeholder="#60a5fa"
                                    className="flex-1 font-mono text-sm"
                                    disabled={isUploading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Preview - Real-time */}
                    <div className="pt-6">
                        <SidebarPreview previewColors={colors} logoZoom={logoZoom} />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            onClick={handleColorSave}
                            disabled={isUploading || !hasUnsavedChanges}
                            className="flex-1 sm:flex-none"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            {hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleResetColors}
                            disabled={isUploading}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Restablecer a Colores RAYMOND
                        </Button>
                    </div>

                    {hasUnsavedChanges && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            Tienes cambios sin guardar. Los colores se están previsualizando.
                        </p>
                    )}
                </div>
            </Card>
        </div>
    )
}
