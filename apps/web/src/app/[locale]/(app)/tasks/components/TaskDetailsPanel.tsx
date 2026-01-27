'use client';

import { Task, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Calendar,
    User as UserIcon,
    Briefcase,
    Edit,
    Trash2,
    CheckCircle2,
    Clock,
    Flag,
    MessageSquare,
    Paperclip,
    ExternalLink,
    X
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import PriorityIndicator from '@/components/shared/PriorityIndicator';
import api from '@/lib/api';

interface TaskDetailsPanelProps {
    task: Task;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => Promise<void>;
    onStatusChange?: (status: string) => Promise<void>;
}

export function TaskDetailsPanel({ task, onClose, onEdit, onDelete, onStatusChange }: TaskDetailsPanelProps) {
    const { user } = useAuthStore();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);

    const userRole = (typeof user?.role === 'string' ? user.role : (user?.role as any)?.name) || '';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'MANAGER', 'PROJECT MANAGER', 'GERENTE OPERACIONES'].includes(userRole.toUpperCase());
    const isCreator = task.reporterId === user?.id;
    const isDone = task.status === 'DONE';

    // Permission check for deletion
    const canDelete = isAdmin || (isCreator && !isDone);

    // Permission check for editing
    // If DONE, only Admin can edit.
    // If not DONE, Admin and Creator can edit.
    const canEdit = isDone ? isAdmin : (isAdmin || isCreator);

    // Permission check for approval (Review -> Done)
    const canApprove = (isAdmin || isCreator) && task.status === 'REVIEW';

    useEffect(() => {
        if (task.id) {
            fetchComments();
        }
    }, [task.id]);

    const fetchComments = async () => {
        try {
            setLoadingComments(true);
            const res = await api.get(`/tasks/${task.id}/comments`);
            // Safely extract array
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setComments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setIsPostingComment(true);
            await api.post(`/tasks/${task.id}/comments`, { content: newComment });
            setNewComment('');
            fetchComments();
            toast.success('Comment posted');
        } catch (error) {
            console.error('Failed to post comment:', error);
            toast.error('Failed to post comment');
        } finally {
            setIsPostingComment(false);
        }
    };

    const handleApprove = async () => {
        if (onStatusChange) {
            await onStatusChange('DONE');
            onClose();
        }
    };

    const handleReject = async () => {
        if (onStatusChange) {
            await onStatusChange('IN_PROGRESS');
            onClose();
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-950">
            {/* Header */}
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1.5">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-snug">
                            {task.title}
                        </h2>
                        <div className="flex items-center gap-2">
                            <Badge variant={task.status === 'DONE' ? 'success' : 'secondary'} className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                {task.status.replace('_', ' ')}
                            </Badge>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <PriorityIndicator priority={task.priority} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{task.priority.toLowerCase()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span>{task.project?.name || 'No Project'}</span>
                    </div>
                    {task.sprint && (
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{task.sprint.name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="w-full justify-start bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="comments">Comments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {task.description || 'No description provided.'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Task Info Section */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                    Task Details
                                </h3>
                            </div>
                            <div className="p-5 space-y-6">
                                {/* Assignee */}
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                        <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</p>
                                        <div className="flex items-center gap-2">
                                            {task.assignee ? (
                                                <>
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={task.assignee.avatarUrl || undefined} />
                                                        <AvatarFallback className="text-[10px]">
                                                            {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {task.assignee.firstName} {task.assignee.lastName}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Reporter */}
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                                        <Flag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reporter</p>
                                        <div className="flex items-center gap-2">
                                            {task.reporter ? (
                                                <>
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={task.reporter.avatarUrl || undefined} />
                                                        <AvatarFallback className="text-[10px]">
                                                            {task.reporter.firstName?.[0]}{task.reporter.lastName?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {task.reporter.firstName} {task.reporter.lastName}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">System</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Drive Link */}
                                {task.driveLink && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                                            <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Drive Link</p>
                                            <a
                                                href={task.driveLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                            >
                                                Open Link
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Created At */}
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</p>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {formatDate(task.createdAt, 'long')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="comments" className="space-y-4">
                        {/* Comment List */}
                        <div className="space-y-4 mb-4">
                            {loadingComments ? (
                                <div className="text-center py-4 text-sm text-gray-500">Loading comments...</div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No comments yet.</p>
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="h-8 w-8 mt-1">
                                            <AvatarImage src={comment.user.avatarUrl || undefined} />
                                            <AvatarFallback>{comment.user.firstName?.[0] || comment.user.firstName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {comment.user.firstName} {comment.user.lastName}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(comment.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Comment Form */}
                        <form onSubmit={handlePostComment} className="flex gap-2 items-start">
                            <div className="flex-1">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="w-full min-h-[80px] p-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isPostingComment || !newComment.trim()}
                                className="h-[80px]"
                            >
                                Post
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center gap-3">
                <div className="flex gap-2">
                    {canApprove && (
                        <>
                            <Button
                                onClick={handleApprove}
                                className="h-9 bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                Approve
                            </Button>
                            <Button
                                onClick={handleReject}
                                variant="outline"
                                className="h-9 text-red-600 border-red-200 hover:bg-red-50"
                            >
                                <X className="w-3.5 h-3.5 mr-2" />
                                Reject
                            </Button>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <Button
                            variant="outline"
                            onClick={onEdit}
                            className="h-9"
                        >
                            <Edit className="w-3.5 h-3.5 mr-2" />
                            Edit Task
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteOpen(true)}
                            className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete Task
                        </Button>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
