"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from '@/components/features/chat/ChatLayout.module.css';

export default function MessageListPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<any[]>([]);

    useEffect(() => {
        const fetchConversations = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // 1. Fetch Chat Rooms where I am involved
            // We join 'matches' to get sport_type, location, etc.
            // We also try to join 'match_applications' via 'matches' to get the applicant player info.
            // Note: match_applications is 1:N with matches. Filtering specific application in the join is hard.
            // So we fetch all applications for the match and filtering in JS is safer/easier.
            const { data: rooms, error } = await supabase
                .from('chat_rooms')
                .select(`
                    *,
                    match:matches!match_id (
                        sport_type,
                        match_location,
                        match_date,
                        home_player_id,
                        match_applications (
                            applicant_user_id,
                            applicant_player_id
                        )
                    ),
                    messages (
                        content,
                        created_at
                    )
                `)
                .or(`host_id.eq.${user.id},applicant_user_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching chat rooms:", error);
                setLoading(false);
                return;
            }

            if (!rooms) {
                setConversations([]);
                setLoading(false);
                return;
            }

            // Filter out rooms where I have left
            const activeRooms = rooms.filter((room: any) => {
                if (room.host_id === user.id) return !room.host_out;
                if (room.applicant_user_id === user.id) return !room.applicant_out;
                return true;
            });

            // 2. Process Data to enrich with Partner Profile
            const enrichedRooms = await Promise.all(activeRooms.map(async (room) => {
                const isHost = room.host_id === user.id;

                // Determine Partner's SPECIFIC Player ID
                let partnerPlayerId = null;
                const partnerUserId = isHost ? room.applicant_user_id : room.host_id;

                if (isHost) {
                    // I am Host. Partner is Applicant.
                    // Find the application for this specific applicant_user_id from the nested match_applications array
                    const apps = room.match?.match_applications || [];
                    const myApp = apps.find((a: any) => a.applicant_user_id === room.applicant_user_id);

                    partnerPlayerId = myApp?.applicant_player_id;

                    // Fallback: If not found in nested array (e.g. maybe limit reached or join issue), try manual fetch
                    if (!partnerPlayerId) {
                        const { data: appData } = await supabase
                            .from('match_applications')
                            .select('applicant_player_id')
                            .eq('match_id', room.match_id)
                            .eq('applicant_user_id', room.applicant_user_id)
                            .maybeSingle();
                        partnerPlayerId = appData?.applicant_player_id;
                    }
                } else {
                    // I am Applicant. Partner is Host.
                    // Host's player ID is in match table (home_player_id)
                    partnerPlayerId = room.match?.home_player_id;
                }

                // Fetch Partner Profile (Try players first for updated info, else profiles)
                let partnerName = "알 수 없음";
                let partnerAvatar = null;

                if (partnerPlayerId) {
                    const { data: player } = await supabase
                        .from('players')
                        .select('player_nickname, name, avatar_url')
                        .eq('id', partnerPlayerId)
                        .limit(1)
                        .maybeSingle();

                    if (player) {
                        partnerName = player.name || player.player_nickname;
                        partnerAvatar = player.avatar_url;
                    }
                }

                // Fallback (if player fetch failed or ID missing)
                if (partnerName === "알 수 없음") {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('user_id', partnerUserId)
                        .single();
                    if (profile) {
                        partnerName = profile.username;
                        partnerAvatar = profile.avatar_url;
                    }
                }

                // Get Last Message
                const sortedMessages = room.messages?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const lastMsg = sortedMessages?.[0]?.content || (room.match ? "매칭이 생성되었습니다." : "대화가 시작되었습니다.");
                const lastTime = sortedMessages?.[0]?.created_at || room.created_at;

                return {
                    id: room.id,
                    partnerName,
                    partnerAvatar,
                    lastMessage: lastMsg,
                    time: lastTime,
                    sportType: room.match?.sport_type
                };
            }));

            // Sort conversations by last message time
            enrichedRooms.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

            setConversations(enrichedRooms);
            setLoading(false);
        };

        fetchConversations();
    }, [router, supabase]);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const dayDiff = Math.floor(diff / (1000 * 3600 * 24));

        if (dayDiff === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (dayDiff === 1) {
            return "어제";
        } else {
            return date.toLocaleDateString();
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Messages...</div>;

    return (
        <main className={styles.container}>
            <h1 className={styles.headerTitle}>메세지</h1>

            <div className={styles.list}>
                {conversations.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        대화 내역이 없습니다.
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={styles.conversationItem}
                            onClick={() => router.push(`/chat/${conv.id}`)}
                        >
                            <div className={styles.avatar}>
                                {conv.partnerAvatar ? (
                                    <img src={conv.partnerAvatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: '#F3F4F6', borderRadius: '50%' }}>👤</div>
                                )}
                            </div>
                            <div className={styles.content}>
                                <div className={styles.topRow}>
                                    <span className={styles.name}>
                                        {conv.partnerName}
                                        {conv.sportType && <span style={{ fontSize: '0.7em', color: '#6B7280', marginLeft: '6px', fontWeight: 'normal' }}>{conv.sportType}</span>}
                                    </span>
                                    <span className={styles.time}>{formatTime(conv.time)}</span>
                                </div>
                                <div className={styles.messagePreview}>{conv.lastMessage}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
