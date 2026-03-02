"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    hideToolbar?: boolean
    onRowClick?: (row: TData) => void
    renderMobileItem?: (row: TData) => React.ReactNode
    initialPageSize?: number
    hidePageSizeSelector?: boolean
    mobileColumns?: number
    onTableReady?: (table: any) => void
    forceTable?: boolean
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    hideToolbar = false,
    onRowClick,
    renderMobileItem,
    initialPageSize = 10,
    hidePageSizeSelector = false,
    mobileColumns,
    onTableReady,
    forceTable = false,
}: DataTableProps<TData, TValue>) {
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
        },
        initialState: {
            pagination: {
                pageSize: initialPageSize,
            },
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    React.useEffect(() => {
        if (onTableReady) {
            onTableReady(table);
        }
    }, [table, onTableReady]);

    return (
        <div className="space-y-4">
            {!hideToolbar && <DataTableToolbar table={table} searchKey={searchKey} />}

            {/* Desktop View / Forced Table View */}
            <div className={cn(
                "hidden",
                forceTable ? "block overflow-x-auto" : "md:block"
            )}>
                <div className={cn(forceTable && "min-w-max")}>
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} colSpan={header.colSpan}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={() => onRowClick?.(row.original)}
                                        className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Mobile View */}
            {!forceTable && (
                <div className={cn(
                    "md:hidden",
                    mobileColumns ? `grid grid-cols-${mobileColumns} gap-4` : "space-y-4"
                )}>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <div
                                key={row.id}
                                onClick={() => onRowClick?.(row.original)}
                                className={onRowClick ? "cursor-pointer" : ""}
                            >
                                {renderMobileItem ? (
                                    renderMobileItem(row.original)
                                ) : (
                                    // Default fallback if no mobile render provided
                                    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                        <div className="space-y-2">
                                            {row.getVisibleCells().map((cell) => (
                                                <div key={cell.id} className="flex justify-between text-sm">
                                                    <span className="font-medium text-muted-foreground">
                                                        {flexRender(cell.column.columnDef.header, cell.getContext() as any)}:
                                                    </span>
                                                    <span>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-4 text-muted-foreground">
                            No results.
                        </div>
                    )}
                </div>
            )}

            <DataTablePagination table={table} hidePageSizeSelector={hidePageSizeSelector} />
        </div>
    )
}
