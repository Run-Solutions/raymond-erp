'use client';

import { useClient, useUpdateClient, useDeleteClient, useClientStats } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Loader from '@/components/ui/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Mail, Phone, User, Edit, Trash2,
    Briefcase, FileText, X, Building2, MapPin
} from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClientForm } from '@/components/clients/ClientForm';
import { toast } from 'sonner';

interface ClientDetailsPanelProps {
    clientId: string;
    onClose: () => void;
    onProjectClick?: (projectId: string) => void;
}

export function ClientDetailsPanel({ clientId, onClose, onProjectClick }: ClientDetailsPanelProps) {
    const { data: client, isLoading: isClientLoading } = useClient(clientId);
    const { data: stats, isLoading: isStatsLoading } = useClientStats(clientId);
    const updateClient = useUpdateClient();
    const deleteClient = useDeleteClient();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const isLoading = isClientLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader size="lg" text="Loading client details..." />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Client not found</h2>
                <Button variant="outline" onClick={onClose}>
                    Close Panel
                </Button>
            </div>
        );
    }

    const handleUpdate = async (data: any) => {
        try {
            await updateClient.mutateAsync({ id: clientId, data });
            toast.success('Client updated successfully');
            setIsEditOpen(false);
        } catch (error) {
            toast.error('Failed to update client');
            console.error(error);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteClient.mutateAsync(clientId);
            toast.success('Client deleted successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to delete client');
            console.error(error);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-800 shadow-sm">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                {client.nombre?.charAt(0) || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1.5">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{client.nombre || 'Unknown Client'}</h2>
                            <div className="flex items-center gap-2">
                                <Badge variant={client.is_active ? 'success' : 'secondary'} className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                    {client.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {client.rfc && (
                                    <span className="text-xs font-mono text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                        {client.rfc}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Actions moved to footer */}
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Projects</span>
                                <Briefcase className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {client._count?.projects || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Active Projects</span>
                                <Building2 className="w-4 h-4 text-purple-500" />
                            </div>
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                {/* Placeholder until we have active count in stats */}
                                {stats?.activeProjects || 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="w-full justify-start bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="projects">Projects</TabsTrigger>
                        <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <Card className="border-none shadow-none bg-transparent">
                            <CardContent className="p-0 space-y-6">
                                {/* Contact Info Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <User className="w-4 h-4 text-blue-500" />
                                            Contact Details
                                        </h3>
                                    </div>
                                    <div className="p-5 space-y-6">
                                        {/* Contact Person */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{client.contacto || 'No contact person'}</p>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</p>
                                                {client.email ? (
                                                    <a href={`mailto:${client.email}`} className="text-sm font-medium text-blue-600 hover:underline block truncate" title={client.email}>
                                                        {client.email}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No email provided</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phone & WhatsApp */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                                                <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone & WhatsApp</p>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {client.telefono ? (
                                                            <a href={`tel:${client.telefono}`} className="hover:text-blue-600 hover:underline">
                                                                {client.telefono}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400 italic">No phone provided</span>
                                                        )}
                                                    </div>
                                                    {client.telefono && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1.5 text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:text-green-800 hover:border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                                            onClick={() => window.open(`https://wa.me/+${client.country_code || '52'}${client.telefono.replace(/[^0-9]/g, '')}`, '_blank')}
                                                        >
                                                            <Phone className="w-3 h-3" />
                                                            Chat
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Address */}
                                        {client.direccion && (
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                                                    <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{client.direccion}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tax ID */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax ID (RFC)</p>
                                                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{client.rfc || 'Not provided'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                try {
                                                    await updateClient.mutateAsync({
                                                        id: clientId,
                                                        data: { is_active: !client.is_active }
                                                    });
                                                    toast.success(client.is_active ? 'Client deactivated' : 'Client activated');
                                                } catch (error) {
                                                    toast.error('Failed to update client status');
                                                }
                                            }}
                                            className={client.is_active
                                                ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20 text-xs h-8"
                                                : "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 text-xs h-8"
                                            }
                                            disabled={updateClient.isPending}
                                        >
                                            {updateClient.isPending ? 'Updating...' : (client.is_active ? 'Deactivate' : 'Activate')}
                                        </Button>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditOpen(true)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 text-xs h-8"
                                            >
                                                <Edit className="w-3.5 h-3.5 mr-2" />
                                                Edit Client
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsDeleteOpen(true)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs h-8"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                Delete Client
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="projects" className="space-y-4">
                        {client.projects && client.projects.length > 0 ? (
                            <div className="grid gap-4">
                                {client.projects.map((project: any) => (
                                    <Card
                                        key={project.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-gray-100 dark:border-gray-800 shadow-sm"
                                        onClick={() => onProjectClick?.(project.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</h4>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{project.description || 'No description'}</p>
                                                </div>
                                                <Badge variant={
                                                    project.status === 'COMPLETED' ? 'success' :
                                                        project.status === 'ACTIVE' ? 'default' :
                                                            project.status === 'PLANNING' ? 'secondary' : 'outline'
                                                }>
                                                    {project.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                {project.amountWithTax && (
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">
                                                        ${Number(project.amountWithTax).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No projects found for this client.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="invoices">
                        <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Invoices module integration coming soon.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Client</DialogTitle>
                    </DialogHeader>
                    <ClientForm
                        initialData={client}
                        onSubmit={handleUpdate}
                        isLoading={updateClient.isPending}
                        onCancel={() => setIsEditOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the client
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {deleteClient.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
