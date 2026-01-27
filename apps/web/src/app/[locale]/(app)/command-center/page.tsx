'use client'

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatches, useDispatchStats, Dispatch } from "@/hooks/useDispatches";
import { DispatchDetailsSheet } from "@/components/command-center/DispatchDetailsSheet";
import { QuickDispatchInput } from "@/components/command-center/executive/QuickDispatchInput";
import { CompactDispatchList } from "@/components/command-center/executive/CompactDispatchList";
import { Loader2, Inbox, Send, Filter, X, CheckCircle2, Clock, AlertTriangle, Mail, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';

export default function CommandCenterPage() {
    const t = useTranslations('commandCenter');
    const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const { user } = useUser();

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

    const { data: receivedData, isLoading: receivedLoading } = useDispatches({
        type: 'received',
        status: statusFilter === 'all' ? undefined : statusFilter,
        urgencyLevel: urgencyFilter === 'all' ? undefined : urgencyFilter,
    });

    const { data: sentData, isLoading: sentLoading } = useDispatches({
        type: 'sent',
        status: statusFilter === 'all' ? undefined : statusFilter,
        urgencyLevel: urgencyFilter === 'all' ? undefined : urgencyFilter,
    });

    const { data: stats } = useDispatchStats();

    const receivedDispatches = receivedData?.data || [];
    const sentDispatches = sentData?.data || [];

    const handleDispatchClick = (dispatch: Dispatch) => {
        setSelectedDispatchId(dispatch.id);
        setSheetOpen(true);
    };

    const unreadCount = stats?.unreadCount || 0;

    if (!user) return null;

    const FilterToolbar = () => (
        <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-base text-muted-foreground mr-2">
                <Filter className="w-5 h-5" />
                <span className="font-medium">{t('filters.title')}</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-10 text-sm bg-background">
                    <SelectValue placeholder={t('filters.status')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
                    <SelectItem value="SENT">{t('status.sent')}</SelectItem>
                    <SelectItem value="READ">{t('status.read')}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t('status.inProgress')}</SelectItem>
                    <SelectItem value="RESOLVED">{t('status.resolved')}</SelectItem>
                    <SelectItem value="CONVERTED_TO_TASK">{t('status.convertedToTask')}</SelectItem>
                </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[160px] h-10 text-sm bg-background">
                    <SelectValue placeholder={t('filters.urgency')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('filters.allUrgency')}</SelectItem>
                    <SelectItem value="NORMAL">{t('urgency.normal')}</SelectItem>
                    <SelectItem value="URGENT">{t('urgency.urgent')}</SelectItem>
                    <SelectItem value="CRITICAL">{t('urgency.critical')}</SelectItem>
                </SelectContent>
            </Select>

            {(statusFilter !== 'all' || urgencyFilter !== 'all') && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStatusFilter('all'); setUrgencyFilter('all'); }}
                    className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground"
                >
                    <X className="w-4 h-4 mr-1.5" />
                    {t('filters.clear')}
                </Button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Quick Input Section - Sticky Top */}
            <QuickDispatchInput
                currentUserId={user.id}
                currentUserAvatar={user.avatarUrl || undefined}
                currentUserInitials={`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'U'}
            />

            <div className="container max-w-6xl mx-auto py-8 px-4 flex-1">
                {/* Header Stats (KPIs) - Made larger */}
                <div className="flex items-center gap-8 mb-8 border border-border/40 rounded-xl px-6 py-4 bg-card/50 shadow-sm w-fit mx-auto md:mx-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <ArrowDownLeft className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('stats.inbox')}</span>
                            <span className="text-lg font-bold leading-none">{stats?.totalReceived || 0}</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-border/50" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('stats.sent')}</span>
                            <span className="text-lg font-bold leading-none">{stats?.totalSent || 0}</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-border/50" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('stats.pending')}</span>
                            <span className="text-lg font-bold leading-none">{stats?.unreadCount || 0}</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-border/50" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('stats.urgent')}</span>
                            <span className="text-lg font-bold leading-none">{stats?.urgentCount || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Tabs - Made larger */}
                <Tabs defaultValue="received" className="w-full space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-muted/50 p-1.5">
                            <TabsTrigger value="received" className="px-8 py-3 relative text-base">
                                <Inbox className="w-5 h-5 mr-2.5" />
                                {t('tabs.inbox')}
                                {unreadCount > 0 && (
                                    <span className="ml-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
                                        {unreadCount}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="sent" className="px-8 py-3 text-base">
                                <Send className="w-5 h-5 mr-2.5" />
                                {t('tabs.sent')}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <FilterToolbar />

                    <TabsContent value="received" className="space-y-4 outline-none mt-0">
                        {receivedLoading ? (
                            <div className="flex items-center justify-center py-32">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
                                <CompactDispatchList
                                    dispatches={receivedDispatches}
                                    onDispatchClick={handleDispatchClick}
                                    currentUserId={user.id}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="sent" className="space-y-4 outline-none mt-0">
                        {sentLoading ? (
                            <div className="flex items-center justify-center py-32">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
                                <CompactDispatchList
                                    dispatches={sentDispatches}
                                    onDispatchClick={handleDispatchClick}
                                    currentUserId={user.id}
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Details Sheet */}
            <DispatchDetailsSheet
                dispatchId={selectedDispatchId}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />
        </div>
    );
}
