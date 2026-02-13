'use client';

import React from 'react';
import {
    ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Loader2 } from "lucide-react";

interface TableListProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    isLoading?: boolean;
    searchKey?: string;
    hideToolbar?: boolean;
    onRowClick?: (row: TData) => void;
    renderMobileItem?: (row: TData) => React.ReactNode;
    emptyMessage?: string | React.ReactNode;
    initialPageSize?: number;
}

export function TableList<TData, TValue>({
    columns,
    data,
    isLoading = false,
    searchKey,
    hideToolbar = false,
    onRowClick,
    renderMobileItem,
    emptyMessage = "No se encontraron resultados.",
    initialPageSize = 10,
}: TableListProps<TData, TValue>) {
    if (isLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-white  rounded-lg border border-gray-200  shadow-sm">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                    <p className="text-sm font-medium text-gray-500 ">Cargando datos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white  rounded-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100  overflow-hidden">
            <div className="p-0">
                <DataTable 
                    columns={columns} 
                    data={data} 
                    searchKey={searchKey}
                    hideToolbar={hideToolbar}
                    onRowClick={onRowClick}
                    renderMobileItem={renderMobileItem}
                    initialPageSize={initialPageSize}
                />
            </div>
            {data.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-500 ">
                    {emptyMessage}
                </div>
            )}
        </div>
    );
}

export default TableList;
