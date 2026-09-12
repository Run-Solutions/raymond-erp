"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type Option = {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
};

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    avoidCollisions?: boolean;
    listClassName?: string;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Seleccionar opciones...",
    searchPlaceholder = "Buscar...",
    emptyMessage = "No se encontraron resultados",
    className,
    side = "bottom",
    sideOffset = 8,
    avoidCollisions = true,
    listClassName,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedLabels = selected
        .map((val) => options.find((o) => o.value === val)?.label)
        .filter(Boolean)
        .join(", ");

    return (
        <div className="flex flex-col gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between bg-gray-50 hover:bg-gray-100 border-gray-200 rounded-2xl font-brand",
                            className
                        )}
                        type="button" // Prevent form submission
                    >
                        <span className={cn(
                            "text-xs font-bold truncate pr-4",
                            selected.length > 0 ? "text-gray-900" : "text-gray-400"
                        )}>
                            {selected.length > 0 ? selectedLabels : placeholder}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400 absolute right-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    side={side}
                    sideOffset={sideOffset}
                    avoidCollisions={avoidCollisions}
                    className="w-[var(--radix-popover-trigger-width)] p-2 bg-white border border-gray-100 shadow-xl rounded-2xl z-50 font-brand"
                >
                    <div className="relative mb-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            className="flex h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-1 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={cn("max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1", listClassName)}>
                        {filteredOptions.length === 0 && (
                            <div className="py-4 text-center text-xs font-medium text-gray-400">
                                {emptyMessage}
                            </div>
                        )}
                        {filteredOptions.map((option) => {
                            const isSelected = selected.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between cursor-pointer select-none",
                                        isSelected
                                            ? "bg-red-50 text-red-600 border border-red-100"
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                    onClick={() => {
                                        onChange(
                                            isSelected
                                                ? selected.filter((item) => item !== option.value)
                                                : [...selected, option.value]
                                        );
                                        // Keep open
                                    }}
                                >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        <div
                                            className={cn(
                                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border",
                                                isSelected
                                                    ? "bg-red-600 border-red-600 text-white"
                                                    : "border-gray-300 text-transparent"
                                            )}
                                        >
                                            <Check className="h-3 w-3" />
                                        </div>
                                        {option.icon && (
                                            <option.icon className="h-4 w-4 text-gray-400" />
                                        )}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
