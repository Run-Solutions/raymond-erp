import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, TrendingUp } from "lucide-react";
import { useTranslations } from 'next-intl';

interface DashboardListsProps {
    topClients: any[];
    topSuppliers: any[];
}

export function DashboardLists({ topClients, topSuppliers }: DashboardListsProps) {
    const t = useTranslations('dashboard.lists')
    // Use real data from backend - no demo data
    const clientsList = topClients || [];
    const suppliersList = topSuppliers || [];

    const getColorForIndex = (index: number) => {
        const colors = [
            'from-blue-500 to-blue-600',
            'from-purple-500 to-purple-600',
            'from-pink-500 to-pink-600',
            'from-orange-500 to-orange-600',
            'from-teal-500 to-teal-600',
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="border-t-4 border-t-purple-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-600" />
                        {t('topClients.title')}
                    </CardTitle>
                    <CardDescription>{t('topClients.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {clientsList.length > 0 ? clientsList.slice(0, 5).map((client, idx) => (
                            <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                                <div className="flex-shrink-0 relative">
                                    <Avatar className={`h-10 w-10 border-2 border-white shadow-sm bg-gradient-to-br ${getColorForIndex(idx)}`}>
                                        <AvatarFallback className="bg-transparent text-white font-semibold">
                                            {client.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-purple-600">#{idx + 1}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold leading-tight truncate">{client.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {client.invoicesCount > 0 && (
                                            <>
                                                <p className="text-xs text-muted-foreground">
                                                    {client.invoicesCount} {client.invoicesCount === 1 ? t('topClients.invoice') : t('topClients.invoices')}
                                                </p>
                                            </>
                                        )}
                                        {client.projectsCount > 0 && (
                                            <>
                                                {client.invoicesCount > 0 && <span className="text-xs text-muted-foreground">•</span>}
                                                <p className="text-xs text-muted-foreground">
                                                    {client.projectsCount} {client.projectsCount === 1 ? 'proyecto' : 'proyectos'}
                                                </p>
                                            </>
                                        )}
                                        {client.revenue && client.revenue > 0 && (
                                            <>
                                                {(client.invoicesCount > 0 || client.projectsCount > 0) && <span className="text-xs text-muted-foreground">•</span>}
                                                <p className="text-xs font-semibold text-green-600">
                                                    ${client.revenue.toLocaleString('es-MX')}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <TrendingUp className="w-4 h-4 text-green-600" />
                            </div>
                        )) : (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    {t('topClients.emptyState.title')}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('topClients.emptyState.description')}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card className="border-t-4 border-t-orange-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-orange-600" />
                        {t('activeSuppliers.title')}
                    </CardTitle>
                    <CardDescription>{t('activeSuppliers.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {suppliersList.length > 0 ? suppliersList.slice(0, 5).map((supplier, idx) => (
                            <div key={supplier.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                                <div className="flex-shrink-0 relative">
                                    <Avatar className={`h-10 w-10 border-2 border-white shadow-sm bg-gradient-to-br ${getColorForIndex(idx)}`}>
                                        <AvatarFallback className="bg-transparent text-white font-semibold">
                                            {supplier.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-orange-600">#{idx + 1}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold leading-tight truncate">{supplier.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {supplier.apCount > 0 && (
                                            <>
                                                <p className="text-xs text-muted-foreground">
                                                    {supplier.apCount} {supplier.apCount === 1 ? t('activeSuppliers.account') : t('activeSuppliers.accounts')}
                                                </p>
                                            </>
                                        )}
                                        {supplier.poCount > 0 && (
                                            <>
                                                {supplier.apCount > 0 && <span className="text-xs text-muted-foreground">•</span>}
                                                <p className="text-xs text-muted-foreground">
                                                    {supplier.poCount} {supplier.poCount === 1 ? 'orden' : 'órdenes'}
                                                </p>
                                            </>
                                        )}
                                        {supplier.totalSpent && supplier.totalSpent > 0 && (
                                            <>
                                                {(supplier.apCount > 0 || supplier.poCount > 0) && <span className="text-xs text-muted-foreground">•</span>}
                                                <p className="text-xs font-semibold text-red-600">
                                                    ${supplier.totalSpent.toLocaleString('es-MX')}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <Building2 className="w-4 h-4 text-orange-600" />
                            </div>
                        )) : (
                            <div className="text-center py-12">
                                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    {t('activeSuppliers.emptyState.title')}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('activeSuppliers.emptyState.description')}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
