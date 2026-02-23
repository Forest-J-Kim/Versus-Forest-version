"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from '@/components/features/chat/ChatLayout.module.css';

const SPORT_MAP: Record<string, string> = {
    SOCCER: '⚽ 축구/풋살',
    BOXING: '🥊 복싱',
    BASKETBALL: '🏀 농구',
    BASEBALL: '⚾ 야구',
    BADMINTON: '🏸 배드민턴/테니스',
    KICKBOXING: '🦵 킥복싱/MMA',
    JUDO: '🥋 유도/주짓수',
    HEALTH: '🏋️ 헬스'
};

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
            // We directly join 'applicant_player' from 'chat_rooms' to get the player info (since we added applicant_player_id to chat_rooms)
            const { data: rooms, error } = await supabase
                .from('chat_rooms')
                .select(`
                    *,
                    match:matches!match_id (
                        sport_type, match_location, match_date, home_player_id,
                        home_player:players!home_player_id(name, avatar_url)
                    ),
                    applicant_player:players!applicant_player_id (
                        name, avatar_url, user_id
                    ),
                    messages ( content, created_at )
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

                let partnerName = "알 수 없음";
                let partnerAvatar = null;
                let sportType = room.match?.sport_type;

                if (isHost) {
                    // [CASE A] 나는 호스트 -> 상대방은 '신청 선수' (또는 매니저)
                    const player = room.applicant_player; // 쿼리에서 가져온 선수 정보

                    if (player) {
                        // 1. 기본은 선수 정보 표시
                        partnerName = player.name || "알 수 없음";
                        partnerAvatar = player.avatar_url;

                        // 2. 대리 신청 확인 (선수 계정 != 신청자 계정)
                        if (player.user_id !== room.applicant_user_id) {
                            let managerName = "매니저";
                            const currentSportType = room.match?.sport_type; // 예: "BOXING"

                            if (currentSportType) {
                                const { data: managerPlayer } = await supabase
                                    .from('players')
                                    .select('name')
                                    .eq('user_id', room.applicant_user_id)
                                    .ilike('sport_type', currentSportType) // ★ 대소문자 무시하고 종목 매칭 (boxing == BOXING)
                                    .maybeSingle();

                                if (managerPlayer) {
                                    managerName = managerPlayer.name;
                                }
                            }

                            // [Step 2] 종목 프로필이 없으면 기본 프로필(Profiles) 조회 (Fallback)
                            if (managerName === "매니저") {
                                const { data: managerProfile } = await supabase
                                    // @ts-ignore
                                    .from('profiles')
                                    .select('nickname') // nickname 컬럼이 없으면 username 사용 등 유연하게 대처
                                    .eq('id', room.applicant_user_id)
                                    .maybeSingle();

                                // @ts-ignore
                                if (managerProfile?.nickname) {
                                    // @ts-ignore
                                    managerName = managerProfile.nickname;
                                }
                            }

                            // 3. 이름 포맷 변경: "선수이름 (매니저: 뚝섬 타이슨)"
                            partnerName = `${partnerName} (매니저: ${managerName})`;
                        }
                    } else {
                        // Legacy Fallback (선수 정보 없을 때)
                        partnerName = "신청자 (정보 없음)";
                    }
                } else {
                    // [CASE B] 나는 게스트(선수/매니저) -> 상대방은 '호스트'
                    const hostPlayer = room.match?.home_player;
                    if (hostPlayer) {
                        partnerName = hostPlayer.name || "알 수 없음";
                        partnerAvatar = hostPlayer.avatar_url;
                    } else {
                        partnerName = "호스트";
                    }
                }

                // Get Last Message
                // @ts-ignore
                const sortedMessages = room.messages?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const lastMsg = sortedMessages?.[0]?.content || (room.match ? "매칭이 생성되었습니다." : "대화가 시작되었습니다.");
                const lastTime = sortedMessages?.[0]?.created_at || room.created_at;

                return {
                    id: room.id,
                    partnerName,
                    partnerAvatar,
                    lastMessage: lastMsg,
                    time: lastTime,
                    sportType
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
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {conv.sportType && <span style={{ fontSize: '0.85em', color: '#6B7280', fontWeight: 'normal' }}>{SPORT_MAP[(conv.sportType as string).toUpperCase()] || conv.sportType}</span>}
                                        <span className={styles.time}>{formatTime(conv.time)}</span>
                                    </div>
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
