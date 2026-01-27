"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Activity, DollarSign } from "lucide-react";
import { useClients, Client } from "@/hooks/useClients";

export function ClientStats() {
    const { data: response, isLoading } = useClients();
    const clients = Array.isArray(response) ? response : (response?.data || []);

    const totalClients = clients?.length || 0;
    const activeClients = clients?.filter((c: Client) => c.is_active).length || 0;
    // Mocking others for now as we don't have endpoints yet
    const activeProjects = clients?.reduce((acc: number, c: Client) => acc + (c._count?.projects || 0), 0) || 0;

    const stats = [
        {
            title: "Total Clients",
            value: isLoading ? "..." : totalClients.toString(),
            change: "Real Data",
            icon: Users,
        },
        {
            title: "Active Clients",
            value: isLoading ? "..." : activeClients.toString(),
            change: "Real Data",
            icon: Activity,
        },
        {
            title: "Total Projects",
            value: isLoading ? "..." : activeProjects.toString(),
            change: "Real Data",
            icon: Briefcase,
        },
        {
            title: "Total Revenue",
            value: "$0.00",
            change: "Not implemented",
            icon: DollarSign,
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {stat.title}
                        </CardTitle>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">
                            {stat.change}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
