'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Button from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    CheckCircle2,
    AlertCircle,
    Info,
    Star,
    TrendingUp,
    Users,
    DollarSign
} from 'lucide-react'

export default function BrandingShowcase() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-accent" />
                        Vista Previa de Personalización
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Así se verán los componentes con los colores de tu marca en toda la aplicación
                    </p>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Buttons Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Botones</h3>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="default">Primario</Button>
                            <Button variant="secondary">Secundario</Button>
                            <Button variant="outline">Contorno</Button>
                            <Button variant="ghost">Fantasma</Button>
                            <Button variant="destructive">Eliminar</Button>
                            <Button variant="success">Éxito</Button>
                        </div>
                    </div>

                    {/* Badges Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Insignias y Estados</h3>
                        <div className="flex flex-wrap gap-3">
                            <Badge variant="default">Predeterminado</Badge>
                            <Badge variant="secondary">Secundario</Badge>
                            <Badge variant="success">Activo</Badge>
                            <Badge variant="destructive">Urgente</Badge>
                            <Badge variant="outline">Pendiente</Badge>
                        </div>
                    </div>

                    {/* Form Inputs Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Formularios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                            <div className="space-y-2">
                                <Label htmlFor="demo-input">Campo de texto</Label>
                                <Input id="demo-input" placeholder="Escribe algo..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="demo-email">Correo electrónico</Label>
                                <Input id="demo-email" type="email" placeholder="correo@ejemplo.com" />
                            </div>
                        </div>
                    </div>

                    {/* Progress Bars Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Barras de Progreso</h3>
                        <div className="space-y-4 max-w-2xl">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progreso del proyecto</span>
                                    <span className="font-medium">75%</span>
                                </div>
                                <Progress value={75} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Tareas completadas</span>
                                    <span className="font-medium">45%</span>
                                </div>
                                <Progress value={45} />
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Tarjetas de Estadísticas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-2">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Total de Usuarios
                                            </p>
                                            <h4 className="text-2xl font-bold text-primary">2,543</h4>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-primary" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-accent mt-2 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        +12.5% desde el mes pasado
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Ingresos
                                            </p>
                                            <h4 className="text-2xl font-bold text-primary">$45,231</h4>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-accent" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-accent mt-2 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        +8.2% desde el mes pasado
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Proyectos Activos
                                            </p>
                                            <h4 className="text-2xl font-bold text-primary">23</h4>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6 text-secondary" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-accent mt-2 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        +5 proyectos nuevos
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Alert Messages Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Mensajes de Alerta</h3>
                        <div className="space-y-3 max-w-2xl">
                            <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-sm text-foreground">Información</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Este es un mensaje informativo con los colores de tu marca
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-accent/20 bg-accent/5">
                                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-sm text-foreground">Éxito</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Operación completada exitosamente
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-destructive/20 bg-destructive/5">
                                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-sm text-foreground">Advertencia</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Por favor revisa esta información importante
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Tablas de Datos</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Proyecto</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Progreso</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Proyecto Alpha</TableCell>
                                        <TableCell><Badge variant="success">Activo</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={85} className="w-24" />
                                                <span className="text-sm text-muted-foreground">85%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Ver</Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Proyecto Beta</TableCell>
                                        <TableCell><Badge variant="outline">Pendiente</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={45} className="w-24" />
                                                <span className="text-sm text-muted-foreground">45%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Ver</Button>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Proyecto Gamma</TableCell>
                                        <TableCell><Badge variant="success">Activo</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={92} className="w-24" />
                                                <span className="text-sm text-muted-foreground">92%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Ver</Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Loading States Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Estados de Carga</h3>
                        <div className="space-y-3 max-w-2xl">
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Info className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-2">
                                Personalización Completa de RAYMOND
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Todos estos componentes utilizan automáticamente los colores de tu marca.
                                Los cambios se aplican instantáneamente en toda la aplicación, incluyendo:
                            </p>
                            <ul className="text-sm text-muted-foreground mt-3 space-y-1 ml-5 list-disc">
                                <li>Barra lateral y navegación principal</li>
                                <li>Botones, badges y controles de formulario</li>
                                <li>Tablas, gráficos y tarjetas de datos</li>
                                <li>Estados de carga y animaciones</li>
                                <li>Barras de desplazamiento y anillos de enfoque</li>
                                <li>Bordes, fondos y gradientes</li>
                            </ul>
                            <p className="text-sm font-medium text-primary mt-4">
                                ¡RAYMOND se transforma completamente en la herramienta de tu empresa!
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
