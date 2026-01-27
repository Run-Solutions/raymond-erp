"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart, CartesianGrid } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, Activity } from "lucide-react";
import { useTranslations } from 'next-intl';

interface DashboardChartsProps {
    revenueData?: Array<{ name: string; total: number }>;
    recentActivity?: Array<{
        id: string;
        action: string;
        resource: string;
        metadata?: any;
        createdAt: string;
        user?: {
            firstName: string;
            lastName: string;
        };
    }>;
}

export function DashboardCharts({ revenueData, recentActivity }: DashboardChartsProps) {
    const t = useTranslations('dashboard')
    // Use real data from backend - revenueData should always have 12 months (even if some are 0)
    const chartData = revenueData && Array.isArray(revenueData) ? revenueData : [];
    
    // Removed debug log for production

    // Calculate trend
    const totalRevenue = chartData.reduce((sum, item) => sum + (item.total || 0), 0);
    const avgRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;
    const lastMonth = chartData.length > 0 ? (chartData[chartData.length - 1]?.total || 0) : 0;
    const previousMonth = chartData.length > 1 ? (chartData[chartData.length - 2]?.total || 0) : 0;
    const trendPercentage = previousMonth > 0 && chartData.length > 1
        ? (((lastMonth - previousMonth) / previousMonth) * 100).toFixed(1)
        : (lastMonth > 0 ? '100.0' : '0.0');

    const getActivityIcon = (action: string) => {
        if (action.includes('create')) return '➕';
        if (action.includes('update')) return '✏️';
        if (action.includes('delete')) return '🗑️';
        if (action.includes('payment')) return '💰';
        return '📝';
    };

    const getActivityDescription = (activity: any) => {
        const { action, resource, metadata } = activity;

        if (resource === 'projects' && action.includes('create')) {
            return `Nuevo proyecto: ${metadata?.name || 'Sin nombre'}`;
        }
        if (resource === 'tasks' && action.includes('create')) {
            return `Nueva tarea: ${metadata?.title || 'Sin título'}`;
        }
        if (resource === 'clients' && action.includes('create')) {
            return `Nuevo cliente: ${metadata?.name || 'Sin nombre'}`;
        }
        if (resource === 'suppliers' && action.includes('create')) {
            return `Nuevo proveedor: ${metadata?.name || 'Sin nombre'}`;
        }
        if (resource === 'finance' && metadata?.concept) {
            const amount = metadata?.amount ? `$${Number(metadata.amount).toLocaleString('es-MX')}` : '';
            return `Cuenta ${metadata?.concept}${amount ? ` - ${amount}` : ''}`;
        }
        if (resource === 'finance' && metadata?.folio) {
            const total = metadata?.total ? `$${Number(metadata.total).toLocaleString('es-MX')}` : '';
            return `Orden de compra ${metadata.folio}${total ? ` - ${total}` : ''}`;
        }

        return `Acción en ${resource}`;
    };

    return (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-t-4 border-t-green-500">
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                {t('charts.revenueOverview.title')}
                            </CardTitle>
                            <CardDescription className="mt-1 text-xs sm:text-sm">
                                {t('charts.revenueOverview.subtitle', { count: chartData.length > 0 ? chartData.length : 12 })}
                            </CardDescription>
                            {chartData.length === 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    No hay datos de ingresos disponibles aún
                                </p>
                            )}
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-xl sm:text-2xl font-bold text-green-600">
                                ${lastMonth.toLocaleString('es-MX')}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className={`font-semibold ${Number(trendPercentage) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {Number(trendPercentage) >= 0 ? '+' : ''}{trendPercentage}%
                                </span>
                                {t('charts.revenueOverview.trend')}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pl-2 pr-2 sm:pl-2 sm:pr-6 pb-4 sm:pb-6">
                    <ResponsiveContainer width="100%" height={280} className="sm:h-[320px]">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(173, 250, 29, 0.1)' }}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                    fontSize: '12px'
                                }}
                                formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, 'Total']}
                            />
                            <Bar
                                dataKey="total"
                                fill="url(#colorGradient)"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={60}
                            />
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#adfa1d" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#adfa1d" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-3 border-t-4 border-t-blue-500">
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        {t('charts.recentActivity.title')}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">{t('charts.recentActivity.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2">
                        {recentActivity && recentActivity.length > 0 ? (
                            recentActivity.slice(0, 6).map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                                        <span className="text-sm">{getActivityIcon(activity.action)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <p className="text-sm font-medium leading-tight">
                                            {getActivityDescription(activity)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    {t('charts.recentActivity.emptyState.title')}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('charts.recentActivity.emptyState.description')}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
