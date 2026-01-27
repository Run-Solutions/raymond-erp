'use client';

import { useState } from 'react';
import { usePhases, useCreatePhase, useDeletePhase, Phase } from '@/hooks/usePhases';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import Loader from '@/components/ui/loader';

interface PhasesManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PhasesManager({ open, onOpenChange }: PhasesManagerProps) {
    const { data: response, isLoading } = usePhases();
    const createPhase = useCreatePhase();
    const deletePhase = useDeletePhase();

    const phases = response?.data || [];

    const [isCreating, setIsCreating] = useState(false);
    const [newPhase, setNewPhase] = useState({
        name: '',
        description: '',
        color: '#3B82F6',
    });

    const handleCreate = async () => {
        if (!newPhase.name.trim()) {
            toast.error('Phase name is required');
            return;
        }

        try {
            await createPhase.mutateAsync({
                name: newPhase.name,
                description: newPhase.description || undefined,
                color: newPhase.color,
                order: phases.length,
            });
            toast.success('Phase created successfully');
            setNewPhase({ name: '', description: '', color: '#3B82F6' });
            setIsCreating(false);
        } catch (error) {
            toast.error('Failed to create phase');
            console.error(error);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        try {
            await deletePhase.mutateAsync(id);
            toast.success('Phase deleted successfully');
        } catch (error) {
            toast.error('Failed to delete phase');
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl">Manage Project Phases</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {/* Existing Phases */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader size="md" text="Loading phases..." />
                        </div>
                    ) : phases.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-sm">No phases yet. Create your first phase below.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Existing Phases ({phases.length})
                            </h3>
                            {phases.map((phase: Phase) => (
                                <div
                                    key={phase.id}
                                    className="flex items-start justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                >
                                    <div className="flex items-start gap-3 flex-1">
                                        <div
                                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                                            style={{ backgroundColor: phase.color || '#3B82F6' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                {phase.name}
                                            </h4>
                                            {phase.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {phase.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => handleDelete(phase.id, phase.name)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Create New Phase */}
                    <div className="border-t pt-4 mt-4">
                        {!isCreating ? (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsCreating(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Phase
                            </Button>
                        ) : (
                            <div className="space-y-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        New Phase
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewPhase({ name: '', description: '', color: '#3B82F6' });
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                                        Name *
                                    </label>
                                    <Input
                                        placeholder="e.g., Planning, Development, Testing"
                                        value={newPhase.name}
                                        onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                                        className="text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                                        Description (Optional)
                                    </label>
                                    <Textarea
                                        placeholder="Describe this phase..."
                                        value={newPhase.description}
                                        onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                                        className="text-sm resize-none"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                                        Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={newPhase.color}
                                            onChange={(e) => setNewPhase({ ...newPhase, color: e.target.value })}
                                            className="h-9 w-16 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                                        />
                                        <Input
                                            value={newPhase.color}
                                            onChange={(e) => setNewPhase({ ...newPhase, color: e.target.value })}
                                            className="text-sm flex-1"
                                            placeholder="#3B82F6"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewPhase({ name: '', description: '', color: '#3B82F6' });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={handleCreate}
                                        disabled={createPhase.isPending}
                                    >
                                        {createPhase.isPending ? 'Creating...' : 'Create Phase'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
