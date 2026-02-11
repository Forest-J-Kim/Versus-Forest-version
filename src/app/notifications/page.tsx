"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

type Notification = {
    id: string;
    created_at: string;
    content: string | null;
    redirect_url: string | null;
    is_read: boolean | null;
    metadata?: any;
};

export default function NotificationsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<PostgrestError | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("receiver_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                setError(error);
            } else {
                setNotifications(data || []);
            }
            setLoading(false);
        };

        fetchNotifications();
    }, []);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));

            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notification.id);
        }

        if (notification.redirect_url) {
            router.push(notification.redirect_url);
        }
    };

    const handleMarkAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("receiver_id", user.id)
            .eq("is_read", false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));

        await supabase
            .from("notifications")
            .delete()
            .eq("id", id);
    };

    const handleBack = () => {
        router.back();
    };

    const getNotificationStyle = (type: string, isRead: boolean) => {
        // 1. Green (Apply, Accept)
        if (['MATCH_APPLY', 'MATCH_ACCEPTED'].includes(type || '')) {
            return isRead
                ? 'bg-green-50 border-green-100 opacity-90' // Read: Washed out green (less transparent)
                : 'bg-green-100 border-green-300 shadow-sm'; // Unread: Vivid green
        }
        // 2. Red (Reject, Cancel)
        if (['MATCH_REJECTED', 'MATCH_CANCEL'].includes(type || '')) {
            return isRead
                ? 'bg-red-50 border-red-100 opacity-90'
                : 'bg-red-100 border-red-300 shadow-sm';
        }
        // 3. Amber (Chat)
        if (['CHAT_OPEN', 'CHAT_INVITE'].includes(type || '')) {
            return isRead
                ? 'bg-amber-50 border-amber-100 opacity-90'
                : 'bg-amber-100 border-amber-300 shadow-sm';
        }
        // 4. Default (Gray/White)
        return isRead ? 'bg-white border-gray-100' : 'bg-white border-gray-300 shadow-sm';
    };

    if (loading) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Error loading notifications</div>;
    }

    return (
        <div className="flex flex-col h-full bg-white relative p-5">
            {/* Header */}
            <header className="flex items-center mb-6 justify-between">
                <div className="flex items-center">
                    <button onClick={handleBack} className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold">알림</h1>
                </div>
                <button
                    onClick={handleMarkAllRead}
                    className="text-sm text-blue-600 font-medium hover:text-blue-800"
                >
                    모두 읽음
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    // Empty State
                    <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mb-4 opacity-50"
                        >
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                        <p>새로운 알림이 없습니다</p>
                    </div>
                ) : (
                    // Notification List
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full p-4 rounded-xl border mb-3 cursor-pointer transition-colors relative group ${getNotificationStyle(notification.metadata?.type, !!notification.is_read)
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col gap-2 flex-1 pr-6">
                                        {notification.metadata ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 text-sm">
                                                        [{notification.metadata.match_title}] {notification.metadata.applicant_name}
                                                    </span>
                                                    {notification.metadata.applicant_weight && (
                                                        <span className="text-xs text-gray-500 font-medium">
                                                            ({notification.metadata.applicant_weight})
                                                        </span>
                                                    )}
                                                </div>

                                                {notification.metadata.message && (
                                                    notification.metadata.type === 'MATCH_APPLY' ? (
                                                        // Case A: Speech Bubble (User Message)
                                                        <div className="bg-white border border-gray-200 shadow-sm p-3 rounded-lg text-sm text-gray-600 relative mt-2">
                                                            "{notification.metadata.message}"
                                                        </div>
                                                    ) : (
                                                        // Case B: System Notification (Icon + Text)
                                                        <div className="mt-2 flex items-center gap-2">
                                                            {notification.metadata.type.includes('ACCEPTED') && <span>✅</span>}
                                                            {notification.metadata.type.includes('REJECTED') && <span>❌</span>}
                                                            {notification.metadata.type.includes('CHAT') && <span>💬</span>}
                                                            {(notification.metadata.type === 'MATCH_CANCEL') && <span>🚫</span>}
                                                            <span className="text-sm font-semibold text-gray-800">
                                                                {notification.metadata.message}
                                                            </span>
                                                        </div>
                                                    )
                                                )}

                                                <p className="text-xs text-gray-400 mt-2">
                                                    {notification.content}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-gray-900 font-medium text-sm">
                                                {notification.content}
                                            </p>
                                        )}

                                        <span className="text-xs text-gray-400 block text-right mt-1">
                                            {new Date(notification.created_at).toLocaleString('ko-KR', {
                                                month: 'numeric',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            })}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, notification.id)}
                                        className="text-gray-400 hover:text-red-500 p-1 shrink-0 ml-2"
                                        aria-label="Delete notification"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 6 6 18" /><path d="m6 6 18 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
