'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    CheckSquare,
    Sun,
    Moon,
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useOrganizationStore } from '@/store/organization.store'

interface SidebarPreviewProps {
    previewColors: {
        primary: string
        secondary: string
        accent: string
    }
    logoZoom?: number
}

export default function SidebarPreview({ previewColors, logoZoom = 1.0 }: SidebarPreviewProps) {
    const { currentOrganization } = useOrganizationStore()
    const [isDark, setIsDark] = useState(true)
    const [activeModule, setActiveModule] = useState('dashboard')

    // Helper functions to convert colors
    const hexToHSL = (hex: string): string => {
        hex = hex.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16) / 255
        const g = parseInt(hex.substring(2, 4), 16) / 255
        const b = parseInt(hex.substring(4, 6), 16) / 255

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        let h = 0, s = 0, l = (max + min) / 2

        if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
                case g: h = ((b - r) / d + 2) / 6; break
                case b: h = ((r - g) / d + 4) / 6; break
            }
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
    }

    const lighten = (hsl: string, lightness: number): string => {
        const parts = hsl.split(' ')
        const h = parts[0]
        const s = parts[1]
        return `${h} ${s} ${lightness}%`
    }

    const darken = (hsl: string, amount: number): string => {
        const parts = hsl.split(' ')
        const h = parts[0]
        const s = parts[1]
        const l = parseInt(parts[2])
        const newL = Math.max(0, l - amount)
        return `${h} ${s} ${newL}%`
    }

    const getContrastColor = (hex: string): string => {
        hex = hex.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance > 0.5 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'
    }

    // Convert preview colors to HSL
    const primaryHSL = hexToHSL(previewColors.primary)
    const secondaryHSL = hexToHSL(previewColors.secondary)
    const accentHSL = hexToHSL(previewColors.accent)
    const primaryRGB = previewColors.primary.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(' ')

    // Generate shades
    const primary900 = darken(primaryHSL, 40)
    const primary600 = darken(primaryHSL, 10)

    const modules = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', category: 'core' },
        { id: 'projects', icon: FolderKanban, label: 'Proyectos', category: 'core' },
        { id: 'tasks', icon: CheckSquare, label: 'Tareas', category: 'core' },
        { id: 'users', icon: Users, label: 'Usuarios', category: 'admin' },
    ]

    const backgroundColor = isDark
        ? `linear-gradient(to bottom, hsl(${primaryHSL} / 0.95), hsl(${primaryHSL} / 0.98), hsl(${primary900} / 1))`
        : `linear-gradient(to bottom, hsl(${primaryHSL} / 0.05), hsl(${primaryHSL} / 0.08), hsl(${primaryHSL} / 0.12))`

    const textColor = isDark ? 'rgb(243 244 246)' : 'rgb(31 41 55)'
    const mutedTextColor = isDark ? 'rgb(156 163 175)' : 'rgb(107 114 128)'
    const borderColor = isDark ? `hsl(${primaryHSL} / 0.3)` : `hsl(${primaryHSL} / 0.2)`

    return (
        <Card className="overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Vista Previa del Sidebar</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsDark(false)}
                            className={cn(
                                'p-2 rounded-lg transition-all',
                                !isDark
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                            aria-label="Modo claro"
                        >
                            <Sun className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsDark(true)}
                            className={cn(
                                'p-2 rounded-lg transition-all',
                                isDark
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                            aria-label="Modo oscuro"
                        >
                            <Moon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Interactúa con la vista previa para ver cómo se verá tu sidebar en tiempo real
                </p>
            </div>

            <div className="p-6">
                <div className="flex gap-6">
                    {/* Sidebar Preview */}
                    <div
                        className="w-64 rounded-lg border-2 overflow-hidden shadow-lg flex flex-col"
                        style={{
                            background: backgroundColor,
                            borderColor: borderColor,
                            minHeight: '500px',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center gap-3 p-4 border-b min-w-0"
                            style={{ borderColor: borderColor }}
                        >
                            <div className="relative w-10 h-10 flex-shrink-0 rounded-full bg-white p-1.5 overflow-hidden">
                                <div
                                    className="relative w-full h-full flex items-center justify-center"
                                    style={{ transform: `scale(${logoZoom})` }}
                                >
                                    <Image
                                        src={currentOrganization?.logoUrl || "/raymond-black.jpeg"}
                                        alt="Logo"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span
                                    className="font-bold text-sm tracking-tight truncate"
                                    style={{ color: textColor }}
                                    title={currentOrganization?.name || 'Tu Empresa'}
                                >
                                    {currentOrganization?.name || 'Tu Empresa'}
                                </span>
                                <span className="text-xs truncate" style={{ color: mutedTextColor }}>
                                    RAYMOND v3.0.3
                                </span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-3 space-y-1">
                            {/* Core Category */}
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">
                                <span style={{ color: `hsl(${accentHSL})` }}>Principal</span>
                            </div>

                            {modules
                                .filter(m => m.category === 'core')
                                .map((module) => {
                                    const Icon = module.icon
                                    const isActive = activeModule === module.id

                                    return (
                                        <button
                                            key={module.id}
                                            onClick={() => setActiveModule(module.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group"
                                            style={
                                                isActive
                                                    ? {
                                                        background: `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${primary600}))`,
                                                        color: getContrastColor(previewColors.primary),
                                                    }
                                                    : {
                                                        color: isDark ? 'rgb(209 213 219)' : 'rgb(75 85 99)',
                                                    }
                                            }
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = `hsl(${primaryHSL} / ${isDark ? '0.1' : '0.15'})`
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'transparent'
                                                }
                                            }}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-sm font-medium">{module.label}</span>
                                            {isActive && (
                                                <div
                                                    className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse"
                                                    style={{ backgroundColor: previewColors.accent }}
                                                />
                                            )}
                                        </button>
                                    )
                                })}

                            {/* Admin Category */}
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider mt-4">
                                <span style={{ color: `hsl(${accentHSL})` }}>Admin</span>
                            </div>

                            {modules
                                .filter(m => m.category === 'admin')
                                .map((module) => {
                                    const Icon = module.icon
                                    const isActive = activeModule === module.id

                                    return (
                                        <button
                                            key={module.id}
                                            onClick={() => setActiveModule(module.id)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
                                            style={
                                                isActive
                                                    ? {
                                                        background: `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${primary600}))`,
                                                        color: getContrastColor(previewColors.primary),
                                                    }
                                                    : {
                                                        color: isDark ? 'rgb(209 213 219)' : 'rgb(75 85 99)',
                                                    }
                                            }
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = `hsl(${primaryHSL} / ${isDark ? '0.1' : '0.15'})`
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.backgroundColor = 'transparent'
                                                }
                                            }}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-sm font-medium">{module.label}</span>
                                            {isActive && (
                                                <div
                                                    className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse"
                                                    style={{ backgroundColor: previewColors.accent }}
                                                />
                                            )}
                                        </button>
                                    )
                                })}
                        </nav>

                        {/* Footer */}
                        <div
                            className="border-t p-4"
                            style={{ borderColor: borderColor }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg"
                                    style={{
                                        background: `linear-gradient(135deg, hsl(${secondaryHSL}), hsl(${accentHSL}))`,
                                    }}
                                >
                                    JD
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: textColor }}>
                                        Juan Pérez
                                    </p>
                                    <p className="text-xs truncate" style={{ color: `hsl(${accentHSL})` }}>
                                        CEO
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: previewColors.primary }} />
                                Color Primario
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Se usa en fondos de sidebar, botones principales, enlaces activos y gradientes.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                    {previewColors.primary}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                    hsl({primaryHSL})
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: previewColors.secondary }} />
                                Color Secundario
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Se usa en avatar del usuario, fondos alternativos y elementos complementarios.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                    {previewColors.secondary}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                    hsl({secondaryHSL})
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: previewColors.accent }} />
                                Color de Acento
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Se usa en notificaciones, badges de estado, indicadores activos y labels de categoría.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                    {previewColors.accent}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                    hsl({accentHSL})
                                </Badge>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Vista Previa Interactiva</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Haz clic en los módulos para ver estados activos. Alterna entre modo claro y oscuro
                                        para ver cómo se adaptan tus colores.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}
