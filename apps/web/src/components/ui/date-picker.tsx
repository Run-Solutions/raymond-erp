"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    onDateChange?: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    fromYear?: number
    toYear?: number
    showYearDropdown?: boolean
}

export function DatePicker({
    date,
    onDateChange,
    placeholder = "Pick a date",
    disabled = false,
    className,
    fromYear = 2020,
    toYear = 2040,
    showYearDropdown = true,
}: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[1001]" align="center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onDateChange}
                    initialFocus
                    captionLayout={showYearDropdown ? "dropdown" : undefined}
                    fromYear={fromYear}
                    toYear={toYear}
                />
            </PopoverContent>
        </Popover>
    )
}
