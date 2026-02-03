"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ChatRoomPage({ params }: { params: { chat_room_id: string } }) {
    const router = useRouter();
    const supabase = createClient();
    const chatRoomId = params.chat_room_id;

    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Meta Data
    const [chatRoom, setChatRoom] = useState<any>(null);
    const [matchInfo, setMatchInfo] = useState<any>(null);

    // Players Logic
    const [hostPlayer, setHostPlayer] = useState<any>(null);
    const [applicantPlayer, setApplicantPlayer] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 1. Init Data
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUserId(user.id);

            // Fetch Chat Room with related match and match_applications info
            // Joining match_applications to find the applicant information
            const { data: room, error: roomError } = await supabase
                .from('chat_rooms')
                .select(`
                    *,
                    match:matches!match_id (
                        id,
                        match_date,
                        match_location,
                        sport_type,
                        home_player_id,
                        target_date,
                        target_time,
                        home_player:players!home_player_id (
                            player_nickname,
                            avatar_url,
                            record,
                            position
                        ),
                        match_applications (
                             applicant_user_id,
                             applicant_player_id,
                             applicant_player:players!applicant_player_id (
                                player_nickname,
                                avatar_url,
                                record,
                                position
                             )
                        )
                    )
                `)
                .eq('id', chatRoomId)
                .single();

            if (roomError || !room) {
                console.error("Chat Room Fetch Error:", roomError);
                alert("채팅방을 찾을 수 없습니다.");
                router.back();
                return;
            }
            setChatRoom(room);
            setMatchInfo(room.match);

            // Identify Host Player Profile
            if (room.match?.home_player) {
                setHostPlayer(room.match.home_player);
            }

            // Identify Applicant Player Profile
            const apps = room.match?.match_applications || [];
            const myApp = apps.find((a: any) => a.applicant_user_id === room.applicant_user_id);
            if (myApp?.applicant_player) {
                setApplicantPlayer(myApp.applicant_player);
            } else {
                // Fallback if joined fetch failed or strict relation issues, try manual fetch
                const { data: appData } = await supabase
                    .from('match_applications')
                    .select(`
                            applicant_player:players!applicant_player_id (
                                player_nickname,
                                avatar_url,
                                record,
                                position
                            )
                        `)
                    .eq('match_id', room.match_id)
                    .eq('applicant_user_id', room.applicant_user_id)
                    .maybeSingle();
                if (appData?.applicant_player) {
                    setApplicantPlayer(appData.applicant_player);
                }
            }

            // Fetch Messages
            const { data: msgs, error: msgError } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_room_id', chatRoomId)
                .order('created_at', { ascending: true });

            if (msgs) setMessages(msgs);

            setLoading(false);
        };

        init();
    }, [chatRoomId, router, supabase]);

    // 2. Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`chat_${chatRoomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_room_id=eq.${chatRoomId}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatRoomId, supabase]);


    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !currentUserId) return;

        const msgToSend = inputMessage;
        setInputMessage("");

        const { error } = await supabase
            .from('messages')
            .insert({
                chat_room_id: chatRoomId,
                sender_id: currentUserId,
                content: msgToSend
            });

        if (error) {
            console.error("Message Send Error:", error);
            alert("메시지 전송 실패");
            setInputMessage(msgToSend); // Restore
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Chat...</div>;

    // Helper for Message Bubble Profile
    const getMessageProfile = (senderId: string) => {
        if (!chatRoom) return { name: "알 수 없음", avatar: null };

        // Determine if sender is Host or Applicant
        const isHostSender = chatRoom.host_id === senderId;
        const profile = isHostSender ? hostPlayer : applicantPlayer;

        return {
            name: profile?.player_nickname || "알 수 없음",
            avatar: profile?.avatar_url
        };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F3F4F6' }}>
            {/* VERSUS Header */}
            <header style={{
                background: 'white',
                padding: '0',
                borderBottom: '1px solid #E5E7EB',
                position: 'sticky', top: 0, zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
                {/* Top Row: Match Details */}
                <div style={{
                    padding: '8px 16px', borderBottom: '1px solid #F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    fontSize: '0.8rem', color: '#6B7280', background: '#FAFAFA'
                }}>
                    <button
                        onClick={() => router.back()}
                        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1, position: 'absolute', left: '16px' }}
                    >
                        ←
                    </button>
                    <span>🗓️ {matchInfo?.target_date || "날짜 미정"}</span>
                    <span>|</span>
                    <span>🕒 {matchInfo?.target_time || "시간 미정"}</span>
                    <span>|</span>
                    <span>📍 {matchInfo?.match_location || "장소 미정"}</span>
                </div>

                {/* Bottom Row: Versus Card */}
                <div style={{
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    {/* Left: Host */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#E5E7EB', marginBottom: '4px', border: '2px solid #3B82F6' }}>
                            {hostPlayer?.avatar_url ? (
                                <img src={hostPlayer.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                            )}
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#111827' }}>{hostPlayer?.player_nickname || "호스트"}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {hostPlayer?.record || "-전 -승"} / {hostPlayer?.position || "-"}
                        </span>
                    </div>

                    {/* Center: VS Badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', fontWeight: '900', fontStyle: 'italic',
                        background: 'linear-gradient(135deg, #EF4444 0%, #3B82F6 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        padding: '0 10px'
                    }}>
                        VS
                    </div>

                    {/* Right: Applicant */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#E5E7EB', marginBottom: '4px', border: '2px solid #EF4444' }}>
                            {applicantPlayer?.avatar_url ? (
                                <img src={applicantPlayer.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                            )}
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#111827' }}>{applicantPlayer?.player_nickname || "신청자"}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {applicantPlayer?.record || "-전 -승"} / {applicantPlayer?.position || "-"}
                        </span>
                    </div>
                </div>
            </header>

            {/* Message List */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, idx) => {
                    const isMyMessage = msg.sender_id === currentUserId;
                    const showProfile = !isMyMessage && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);
                    const profileData = !isMyMessage ? getMessageProfile(msg.sender_id) : null;

                    return (
                        <div
                            key={msg.id || idx}
                            style={{
                                display: 'flex',
                                flexDirection: isMyMessage ? 'row-reverse' : 'row',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}
                        >
                            {/* Profile Image for Other User */}
                            {!isMyMessage && (
                                <div style={{ width: '40px', flexShrink: 0 }}>
                                    {showProfile && (
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: '#E5E7EB', overflow: 'hidden',
                                            border: '1px solid #D1D5DB'
                                        }}>
                                            {profileData?.avatar ? (
                                                <img src={profileData.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Message Bubble */}
                            <div style={{ maxWidth: '70%' }}>
                                {(!isMyMessage && showProfile) && (
                                    <div style={{ fontSize: '0.8rem', color: '#4B5563', marginBottom: '4px', marginLeft: '4px' }}>
                                        {profileData?.name}
                                    </div>
                                )}
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: '16px',
                                    borderTopRightRadius: isMyMessage ? '2px' : '16px',
                                    borderTopLeftRadius: !isMyMessage ? '2px' : '16px',
                                    background: isMyMessage ? '#3B82F6' : 'white',
                                    color: isMyMessage ? 'white' : '#111827',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.4',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    wordBreak: 'break-word'
                                }}>
                                    {msg.content}
                                </div>
                                <div style={{
                                    fontSize: '0.7rem', color: '#9CA3AF', marginTop: '2px',
                                    textAlign: isMyMessage ? 'right' : 'left', marginRight: '4px', marginLeft: '4px'
                                }}>
                                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Area */}
            <footer style={{
                background: 'white', padding: '12px 16px',
                borderTop: '1px solid #E5E7EB',
                position: 'sticky', bottom: 0
            }}>
                <div style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-end',
                    background: '#F9FAFB', borderRadius: '24px', padding: '8px 12px',
                    border: '1px solid #E5E7EB'
                }}>
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        style={{
                            flex: 1, border: 'none', background: 'transparent',
                            outline: 'none', fontSize: '1rem',
                            resize: 'none', minHeight: '24px', maxHeight: '100px',
                            padding: '4px 0', lineHeight: '1.5'
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        style={{
                            background: inputMessage.trim() ? '#3B82F6' : '#E5E7EB',
                            color: 'white',
                            border: 'none', borderRadius: '50%',
                            width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: inputMessage.trim() ? 'pointer' : 'default',
                            marginBottom: '2px', transition: 'background 0.2s'
                        }}
                    >
                        ➤
                    </button>
                </div>
            </footer>
        </div>
    );
}
