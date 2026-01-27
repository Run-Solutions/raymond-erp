'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Filter, X, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Button from '@/components/ui/button'
import Badge from '@/components/ui/badge'
import Loader from '@/components/ui/loader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuditLog } from '@/types'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface AuditLogsResponse {
    success: boolean
    data: AuditLog[]
    total: number
    limit: number
    offset: number
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [limit, setLimit] = useState(50)
    const [offset, setOffset] = useState(0)
    
    // Filters
    const [search, setSearch] = useState('')
    const [resourceFilter, setResourceFilter] = useState<string>('')
    const [actionFilter, setActionFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [showFilters, setShowFilters] = useState(false)
    
    // Get unique values for filters
    const [availableResources, setAvailableResources] = useState<string[]>([])
    const [availableActions, setAvailableActions] = useState<string[]>([])

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (limit) params.append('limit', limit.toString())
            if (offset) params.append('offset', offset.toString())
            if (search) params.append('search', search)
            if (resourceFilter) params.append('resource', resourceFilter)
            if (actionFilter) params.append('action', actionFilter)
            if (statusFilter) params.append('status', statusFilter)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)

            const response = await api.get<AuditLogsResponse>(`/audit?${params.toString()}`)
            if (response.data.success) {
                setLogs(response.data.data || [])
                setTotal(response.data.total || 0)
                setLimit(response.data.limit || 50)
                setOffset(response.data.offset || 0)
                
                // Extract unique values for filters
                const resources = [...new Set(response.data.data.map(log => log.resource))].sort()
                const actions = [...new Set(response.data.data.map(log => log.action))].sort()
                setAvailableResources(resources)
                setAvailableActions(actions)
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error)
        } finally {
            setLoading(false)
        }
    }, [limit, offset, search, resourceFilter, actionFilter, statusFilter, startDate, endDate])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const handleExport = async () => {
        try {
            const params = new URLSearchParams()
            if (resourceFilter) params.append('resource', resourceFilter)
            if (actionFilter) params.append('action', actionFilter)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)

            const response = await api.get(`/audit/export?${params.toString()}`, {
                responseType: 'blob',
            })

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Failed to export audit logs:', error)
        }
    }

    const clearFilters = () => {
        setSearch('')
        setResourceFilter('')
        setActionFilter('')
        setStatusFilter('')
        setStartDate('')
        setEndDate('')
        setOffset(0)
    }

    const hasActiveFilters = search || resourceFilter || actionFilter || statusFilter || startDate || endDate

    const totalPages = Math.ceil(total / limit)
    const currentPage = Math.floor(offset / limit) + 1

    const getActionBadgeVariant = (action: string) => {
        const upperAction = action.toUpperCase()
        if (upperAction.includes('CREATE') || upperAction.includes('SUCCESS') || upperAction.includes('LOGIN')) {
            return 'success'
        }
        if (upperAction.includes('DELETE') || upperAction.includes('FAILED') || upperAction.includes('ERROR')) {
            return 'destructive'
        }
        if (upperAction.includes('UPDATE') || upperAction.includes('EDIT')) {
            return 'secondary'
        }
        return 'secondary'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Registros de Auditoría</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Rastrea todas las actividades del sistema</p>
                </div>
                <Button 
                    variant="secondary" 
                    onClick={handleExport}
                    disabled={loading || logs.length === 0}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                </Button>
            </div>

            <Card className="p-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar en acciones, recursos o usuarios..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setOffset(0)
                                }}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <Button 
                            variant={showFilters ? "default" : "secondary"}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filtros
                            {hasActiveFilters && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                    {[search, resourceFilter, actionFilter, statusFilter, startDate, endDate].filter(Boolean).length}
                                </span>
                            )}
                        </Button>
                        {hasActiveFilters && (
                            <Button variant="ghost" onClick={clearFilters} size="sm">
                                <X className="w-4 h-4 mr-1" />
                                Limpiar
                            </Button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Recurso
                                </label>
                                <Select value={resourceFilter} onValueChange={(value) => {
                                    setResourceFilter(value)
                                    setOffset(0)
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos los recursos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Todos los recursos</SelectItem>
                                        {availableResources.map((resource) => (
                                            <SelectItem key={resource} value={resource}>
                                                {resource}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Acción
                                </label>
                                <Select value={actionFilter} onValueChange={(value) => {
                                    setActionFilter(value)
                                    setOffset(0)
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas las acciones" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Todas las acciones</SelectItem>
                                        {availableActions.map((action) => (
                                            <SelectItem key={action} value={action}>
                                                {action}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Estado
                                </label>
                                <Select value={statusFilter} onValueChange={(value) => {
                                    setStatusFilter(value)
                                    setOffset(0)
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos los estados" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Todos los estados</SelectItem>
                                        <SelectItem value="SUCCESS">Éxito</SelectItem>
                                        <SelectItem value="FAILED">Fallido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Fecha desde
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value)
                                        setOffset(0)
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Fecha hasta
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value)
                                        setOffset(0)
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                {loading ? (
                    <div className="p-12">
                        <Loader size="lg" text="Cargando registros de auditoría..." />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No se encontraron registros de auditoría</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recurso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IP</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 text-sm">
                                                {log.user ? (
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {log.user.firstName} {log.user.lastName}
                                                        </div>
                                                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                                                            {log.user.email}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 dark:text-gray-400 italic">Sistema</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge 
                                                    variant={getActionBadgeVariant(log.action)} 
                                                    size="sm"
                                                >
                                                    {log.action}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {log.resource}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge 
                                                    variant={log.status === 'SUCCESS' ? 'success' : 'destructive'} 
                                                    size="sm"
                                                >
                                                    {log.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {log.ipAddress || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(log.createdAt, 'long')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total} registros
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setOffset(Math.max(0, offset - limit))}
                                    disabled={offset === 0 || loading}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Anterior
                                </Button>
                                <div className="text-sm text-gray-700 dark:text-gray-300 px-3">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setOffset(offset + limit)}
                                    disabled={offset + limit >= total || loading}
                                >
                                    Siguiente
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}
