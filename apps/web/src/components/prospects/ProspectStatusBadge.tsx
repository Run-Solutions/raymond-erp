import Badge from '@/components/ui/badge';
import { ProspectStatus } from '@/hooks/useProspects';

interface ProspectStatusBadgeProps {
    status: ProspectStatus;
    className?: string;
}

const statusConfig: Record<ProspectStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline'; className?: string }> = {
    [ProspectStatus.NEW]: {
        label: 'Nuevo',
        variant: 'secondary',
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    [ProspectStatus.CONTACTED]: {
        label: 'Contactado',
        variant: 'default',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    [ProspectStatus.QUALIFIED]: {
        label: 'Calificado',
        variant: 'default',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    [ProspectStatus.PROPOSAL_SENT]: {
        label: 'Propuesta Enviada',
        variant: 'default',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    },
    [ProspectStatus.NEGOTIATION]: {
        label: 'Negociación',
        variant: 'default',
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    },
    [ProspectStatus.WON]: {
        label: 'Ganado',
        variant: 'success',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    [ProspectStatus.LOST]: {
        label: 'Perdido',
        variant: 'destructive',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
};

export function ProspectStatusBadge({ status, className }: ProspectStatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <Badge
            variant={config.variant}
            className={`px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${config.className} ${className || ''}`}
        >
            {config.label}
        </Badge>
    );
}

