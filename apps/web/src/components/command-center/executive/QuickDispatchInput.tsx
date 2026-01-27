'use client'

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ArrowRight,
    Zap,
    User as UserIcon,
    Calendar as CalendarIcon,
    AlertCircle,
    Clock
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useCreateDispatch } from "@/hooks/useDispatches";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format, isToday, setHours, setMinutes } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

interface QuickDispatchInputProps {
    currentUserId: string;
    currentUserAvatar?: string;
    currentUserInitials?: string;
}

export function QuickDispatchInput({
    currentUserId,
    currentUserAvatar,
    currentUserInitials
}: QuickDispatchInputProps) {
    const [content, setContent] = useState("");
    const [description, setDescription] = useState("");
    const [link, setLink] = useState("");
    const [recipientId, setRecipientId] = useState<string>("");
    const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('NORMAL');
    const [isSelfAssigned, setIsSelfAssigned] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isUserOpen, setIsUserOpen] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const { data: usersData, isLoading: isLoadingUsers } = useUsers();
    const createDispatch = useCreateDispatch();

    // Default to self-assigned initially or keep empty?
    // Requirement: "Auto-assign to me with one click".

    interface UserWithRole {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
        role?: {
            id?: string;
            name?: string;
        } | string;
    }

    const allUsers: UserWithRole[] = Array.isArray(usersData) 
        ? usersData as UserWithRole[]
        : (usersData && typeof usersData === 'object' && 'data' in usersData && Array.isArray((usersData as { data: unknown }).data))
            ? (usersData as { data: UserWithRole[] }).data
            : [];

    // Sort users by name
    const sortedUsers = [...allUsers].sort((a, b) =>
        (a.firstName || '').localeCompare(b.firstName || '')
    );

    const selectedUser = allUsers.find((u) => u.id === recipientId);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!content.trim()) return;

        const finalRecipientId = isSelfAssigned ? currentUserId : recipientId;

        if (!finalRecipientId) {
            toast.error("Please select a recipient or assign to yourself");
            return;
        }

        try {
            await createDispatch.mutateAsync({
                content: content.trim(),
                description: description.trim() || undefined,
                link: link.trim() || undefined,
                recipientId: finalRecipientId,
                urgencyLevel: urgency,
                dueDate: selectedDate.toISOString(),
            });

            toast.success("Dispatch sent & synced to calendar");
            setContent("");
            setDescription("");
            setLink("");
            setUrgency('NORMAL');
            setSelectedDate(new Date()); // Reset to now
            setIsDetailsOpen(false);
            // Keep recipient selection for rapid fire? Or reset?
            // Usually reset is safer to avoid wrong sends.
            if (isSelfAssigned) {
                // Keep self assigned
            } else {
                setRecipientId("");
            }
        } catch (error) {
            toast.error("Failed to send dispatch");
        }
    };

    const toggleSelfAssign = () => {
        if (isSelfAssigned) {
            setIsSelfAssigned(false);
            setRecipientId("");
        } else {
            setIsSelfAssigned(true);
            setRecipientId(currentUserId);
        }
        inputRef.current?.focus();
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [hours, minutes] = e.target.value.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return;

        const newDate = new Date(selectedDate);
        // Ensure the base date is valid
        if (isNaN(newDate.getTime())) {
            const now = new Date();
            now.setHours(hours);
            now.setMinutes(minutes);
            setSelectedDate(now);
            return;
        }

        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        setSelectedDate(newDate);
    };

    // Safety check for rendering
    const validDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

    const [searchQuery, setSearchQuery] = useState("");

    const filteredUsers = sortedUsers.filter((user: any) => {
        const searchLower = searchQuery.toLowerCase();
        const name = `${user.firstName} ${user.lastName}`.toLowerCase();
        const role = (user.role?.name || user.role || '').toLowerCase();
        return name.includes(searchLower) || role.includes(searchLower);
    });

    return (
        <div className="w-full bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-sm bg-background/95 supports-[backdrop-filter]:bg-background/60 flex flex-col transition-all duration-200">
            <div className="max-w-5xl mx-auto w-full p-4 flex items-center gap-3">
                {/* Status/Urgency Indicator */}
                <div className="flex-shrink-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-full transition-colors",
                                    urgency === 'NORMAL' && "text-muted-foreground hover:text-foreground hover:bg-muted",
                                    urgency === 'URGENT' && "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20",
                                    urgency === 'CRITICAL' && "text-red-500 bg-red-500/10 hover:bg-red-500/20"
                                )}
                            >
                                {urgency === 'CRITICAL' ? <AlertCircle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-0" align="start">
                            <div className="flex flex-col">
                                <Button variant="ghost" className="justify-start" onClick={() => setUrgency('NORMAL')}>
                                    <div className="h-2 w-2 rounded-full bg-gray-400 mr-2" /> Normal
                                </Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setUrgency('URGENT')}>
                                    <div className="h-2 w-2 rounded-full bg-orange-500 mr-2" /> Urgent
                                </Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setUrgency('CRITICAL')}>
                                    <div className="h-2 w-2 rounded-full bg-red-500 mr-2" /> Critical
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Main Input */}
                <div className="flex-1 relative">
                    <Input
                        ref={inputRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a new dispatch... (Enter to send)"
                        className="h-12 text-lg border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent placeholder:text-muted-foreground/50"
                    />
                </div>

                {/* Assignee Selector */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={isSelfAssigned ? "secondary" : "ghost"}
                        size="sm"
                        onClick={toggleSelfAssign}
                        className={cn("h-8 px-2 text-xs font-medium transition-all", isSelfAssigned && "bg-primary/10 text-primary hover:bg-primary/20")}
                    >
                        {isSelfAssigned ? "Me" : "Assign to me"}
                    </Button>

                    {!isSelfAssigned && (
                        <Popover open={isUserOpen} onOpenChange={setIsUserOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full px-2 border-dashed">
                                    {selectedUser ? (
                                        <>
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={selectedUser.avatarUrl || undefined} />
                                                <AvatarFallback className="text-[10px]">{selectedUser.firstName[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="max-w-[100px] truncate">{selectedUser.firstName}</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">Assign...</span>
                                        </>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-2 w-[280px] z-50" align="end">
                                <div className="flex flex-col gap-2">
                                    <Input
                                        placeholder="Search user..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 text-sm"
                                        autoFocus
                                    />
                                    <div className="max-h-[250px] overflow-y-auto flex flex-col gap-1">
                                        {isLoadingUsers ? (
                                            <div className="py-4 text-center text-sm text-muted-foreground">
                                                Loading users...
                                            </div>
                                        ) : filteredUsers.length === 0 ? (
                                            <div className="py-4 text-center text-sm text-muted-foreground">
                                                No user found.
                                            </div>
                                        ) : (
                                            filteredUsers.map((user: any) => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => {
                                                        console.log("Selected user:", user.id);
                                                        setRecipientId(user.id);
                                                        setIsSelfAssigned(false);
                                                        setIsUserOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-accent",
                                                        recipientId === user.id && "bg-accent"
                                                    )}
                                                >
                                                    <Avatar className="h-8 w-8 shrink-0">
                                                        <AvatarImage src={user.avatarUrl || undefined} />
                                                        <AvatarFallback>{user.firstName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col overflow-hidden flex-1">
                                                        <span className="text-sm font-medium truncate">{user.firstName} {user.lastName}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate">{user.role?.name || user.role}</span>
                                                    </div>
                                                    {recipientId === user.id && (
                                                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>

                {/* Date & Time Picker */}
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50",
                                !isToday(validDate) && "text-primary bg-primary/10 hover:bg-primary/20"
                            )}
                        >
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                            {isToday(validDate) ? "Today" : format(validDate, "MMM d")}
                            <span className="mx-1 opacity-30">|</span>
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            {format(validDate, "HH:mm")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <div className="p-3 border-b border-border/50">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">Time:</span>
                                <Input
                                    type="time"
                                    value={format(validDate, "HH:mm")}
                                    onChange={handleTimeChange}
                                    className="h-8 w-32"
                                />
                            </div>
                        </div>
                        <Calendar
                            mode="single"
                            selected={validDate}
                            onSelect={(date) => {
                                if (date) {
                                    const newDate = new Date(date);
                                    newDate.setHours(validDate.getHours());
                                    newDate.setMinutes(validDate.getMinutes());
                                    setSelectedDate(newDate);
                                }
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* Toggle Details */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                    className={cn(
                        "h-8 w-8 rounded-full transition-colors",
                        (isDetailsOpen || description || link) && "bg-primary/10 text-primary"
                    )}
                >
                    <span className="text-lg leading-none mb-1">+</span>
                </Button>

                {/* Submit Button */}
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full shrink-0"
                    onClick={handleSubmit}
                    disabled={!content.trim() || (!recipientId && !isSelfAssigned)}
                >
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Expanded Details Section */}
            {isDetailsOpen && (
                <div className="max-w-5xl mx-auto w-full px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="grid gap-3 pl-14">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add additional comments (optional)..."
                            className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        />
                        <div className="flex items-center gap-2">
                            <Input
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                placeholder="Add a URL link (optional)..."
                                className="h-9"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
