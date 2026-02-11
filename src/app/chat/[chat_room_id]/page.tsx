"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/types/supabase";

export default function ChatRoomPage({ params }: { params: Promise<{ chat_room_id: string }> }) {
    const router = useRouter();
    const supabase = createClient<Database>();
    const unwrappedParams = use(params);
    const chatRoomId = unwrappedParams.chat_room_id;

    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]); // Keep as any[] for now for mixed profile data, or define stricter type if possible
    const [inputMessage, setInputMessage] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Meta Data
    const [chatRoom, setChatRoom] = useState<any>(null); // Type this properly if needed, but 'any' is safe for now
    const [matchInfo, setMatchInfo] = useState<any>(null);

    // Players Logic
    const [hostPlayer, setHostPlayer] = useState<any>(null);
    const [applicantPlayer, setApplicantPlayer] = useState<any>(null);
    const [applicantUser, setApplicantUser] = useState<any>(null); // For Proxy App Display

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 1. Init Data (수정된 버전: 분리 조회 방식)
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUserId(user.id);

            // [Step 1] 채팅방 기본 정보만 먼저 조회 (Join 없이 안전하게)
            const { data: roomBasic, error: roomError } = await supabase
                .from('chat_rooms')
                .select('*')
                .eq('id', chatRoomId)
                .single();

            if (roomError || !roomBasic) {
                console.error("Chat Room Fetch Error:", roomError);
                alert("채팅방을 찾을 수 없습니다.");
                router.back();
                return;
            }



            // [Step 2] 매치 정보 및 관련 데이터 별도 조회
            // (status가 DELETED여도 가져오도록 maybeSingle 사용 및 Join 단순화)
            const { data: matchData } = await supabase
                .from('matches')
                .select(`
                    id, match_date, match_location, sport_type, sport, status,
                    home_player_id, home_team_id,
                    home_player: players!home_player_id(
                        name, player_nickname, avatar_url, record, position
                    ),
                    home_team: teams!home_team_id(
                        team_name
                    ),
                    away_player_id, away_team_id,
                    away_player: players!away_player_id(
                        name, player_nickname, avatar_url, record, position, user_id, sport_type
                    ),
                    away_team: teams!away_team_id(
                        team_name
                    ),
                    match_applications(
                        applicant_user_id, applicant_player_id,
                        applicant_player: players!applicant_player_id(
                            name, player_nickname, avatar_url, record, position, user_id
                        )
                    )
                        `)
                .eq('id', roomBasic.match_id)
                .maybeSingle(); // match가 없거나 권한 문제로 안 보여도 에러 안 냄 (null 반환)

            // [Step 2.5] Fetch Applicant 'Chat Partner' Profile (Manager)
            // Fix: Filter by Sport Type first!
            let fetchedApplicantUser = null;
            if (roomBasic.applicant_user_id) {
                // Priority 1: Match Sport Player Profile
                // Use matchData.sport_type (uppercase) but match case-insensitively with player's sport_type (lowercase)
                const targetSport = matchData?.sport_type || matchData?.sport;

                if (targetSport) {
                    const { data: sportProfile } = await supabase
                        .from('players')
                        .select('name, player_nickname, avatar_url, user_id, sport_type')
                        .eq('user_id', roomBasic.applicant_user_id)
                        .ilike('sport_type', targetSport) // Fix: Case-insensitive match!
                        .limit(1)
                        .maybeSingle();

                    if (sportProfile) fetchedApplicantUser = sportProfile;
                }

                // Priority 2: Any Player Profile (Fallback)
                if (!fetchedApplicantUser) {
                    const { data: anyProfile } = await supabase
                        .from('players')
                        .select('name, player_nickname, avatar_url, user_id')
                        .eq('user_id', roomBasic.applicant_user_id)
                        .limit(1)
                        .maybeSingle();

                    if (anyProfile) fetchedApplicantUser = anyProfile;
                }

                // Priority 3: Basic Profile (Fallback)
                if (!fetchedApplicantUser) {
                    // @ts-ignore
                    const { data: basicProfile } = await supabase
                        .from('profiles')
                        .select('nickname, avatar_url')
                        .eq('id', roomBasic.applicant_user_id)
                        .single();

                    if (basicProfile) {
                        fetchedApplicantUser = {
                            name: basicProfile.nickname,
                            avatar_url: basicProfile.avatar_url,
                            user_id: roomBasic.applicant_user_id
                        };
                    }
                }
            }
            if (fetchedApplicantUser) setApplicantUser(fetchedApplicantUser);

            // [Step 2.5] Fetch Team Info Manually (Fallback if join failed)
            let homeTeamData = matchData?.home_team;
            if (matchData?.home_team_id && !homeTeamData) {
                const { data: team } = await supabase
                    .from('teams')
                    .select('team_name')
                    .eq('id', matchData.home_team_id)
                    .maybeSingle();
                homeTeamData = team;
            }

            const finalMatchInfo = { ...matchData, home_team: homeTeamData };

            // [Step 3] 데이터 병합 (UI가 기존 코드를 그대로 쓸 수 있게 구조 맞춤)
            const room = { ...roomBasic, match: finalMatchInfo };

            setChatRoom(room);
            setMatchInfo(finalMatchInfo);

            // Identify Host Player Profile
            if (finalMatchInfo?.home_player) {
                setHostPlayer(finalMatchInfo.home_player);
            }

            // Identify Applicant Player Profile
            // Priority 1: Find matching applicant from applications list
            const apps = finalMatchInfo?.match_applications || [];
            // @ts-ignore
            const myApp = apps.find((a: any) => a.applicant_user_id === room.applicant_user_id);

            if (myApp?.applicant_player) {
                setApplicantPlayer(myApp.applicant_player);
            } else {
                // Fallback: 신청자 정보가 조인으로 안 왔을 때 수동 조회
                const { data: appData } = await supabase
                    .from('match_applications')
                    .select(`
                        applicant_player: players!applicant_player_id(
                        name, player_nickname, avatar_url, record, position, user_id
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
            const { data: msgs } = await supabase
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
                    filter: `chat_room_id = eq.${chatRoomId}`
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

    const handleLeaveChat = async () => {
        if (!confirm("채팅방을 나가시겠습니까? 목록에서 삭제됩니다.")) return;
        if (!chatRoom || !currentUserId) return;

        // [System Message] Insert Left Message first
        await supabase.from('messages').insert({
            chat_room_id: chatRoomId,
            sender_id: currentUserId,
            content: "system:::user_left"
        });

        const isHost = chatRoom.host_id === currentUserId;
        const updateField = isHost ? 'host_out' : 'applicant_out';

        // 1. Update Status
        const { data: updatedRoom, error: updateError } = await supabase
            .from('chat_rooms')
            .update({ [updateField]: true })
            .eq('id', chatRoomId)
            .select()
            .single();

        if (updateError) {
            console.error("Leave Chat Error:", updateError);
            alert("나가기 실패: " + updateError.message);
            return;
        }

        // 2. Check if Both Left -> Hard Delete
        // @ts-ignore
        if (updatedRoom.host_out && updatedRoom.applicant_out) {
            const { error: deleteError } = await supabase
                .from('chat_rooms')
                .delete()
                .eq('id', chatRoomId);

            if (deleteError) {
                console.error("Delete Room Error:", deleteError);
                // Even if delete fails, redirect user
            }
        }

        router.push('/messages');
    };

    if (loading) return <div className="p-8 text-center">Loading Chat...</div>;

    // Helper for Message Bubble Profile
    const getMessageProfile = (senderId: string) => {
        if (!chatRoom) return { name: "알 수 없음", avatar: null };

        // Determine if sender is Host or Applicant
        const isHostSender = chatRoom.host_id === senderId;

        if (isHostSender) {
            return {
                name: hostPlayer?.name || hostPlayer?.player_nickname || "호스트",
                avatar: hostPlayer?.avatar_url
            };
        } else {
            // Applicant Side Logic
            // Check for Proxy: applicant_user_id vs player.user_id

            const isProxy = applicantPlayer?.user_id && chatRoom.applicant_user_id !== applicantPlayer.user_id;

            if (isProxy && applicantUser) {
                // Return Manager's Profile
                return {
                    name: applicantUser.name || applicantUser.player_nickname || "신청자(매니저)",
                    avatar: applicantUser.avatar_url
                };
            }

            // Fallback / Normal: Applicant Player Profile
            return {
                name: applicantPlayer?.name || applicantPlayer?.player_nickname || "신청자",
                avatar: applicantPlayer?.avatar_url
            };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F3F4F6' }}>
            {/* VERSUS Header */}
            <header style={{
                background: 'white',
                padding: '0',
                borderBottom: '1px solid #E5E7EB',
                position: 'sticky', top: 0, zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                // opacity removed here to allow Leave button to be clear
            }}>
                {/* [Soft Delete] Warning Banner */}
                {matchInfo?.status === 'DELETED' && (
                    <div style={{
                        background: '#EF4444', color: 'white', fontSize: '0.8rem', fontWeight: 'bold',
                        textAlign: 'center', padding: '4px'
                    }}>
                        🔴 삭제된 매치 (Deleted)
                    </div>
                )}
                {/* Top Row: Match Details */}
                <div style={{
                    padding: '10px 16px', borderBottom: '1px solid #F3F4F6',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    fontSize: '0.85rem', color: '#6B7280', background: '#FAFAFA',
                    position: 'relative'
                }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1,
                            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                            opacity: matchInfo?.status === 'DELETED' ? 0.6 : 1
                        }}
                    >
                        ←
                    </button>
                    <button
                        onClick={handleLeaveChat}
                        style={{
                            background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer',
                            color: '#EF4444', fontWeight: 'bold',
                            position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                            opacity: 1 // Explicitly keep clear
                        }}
                    >
                        나가기
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: matchInfo?.status === 'DELETED' ? 0.6 : 1 }}>
                        <span>🗓️ {matchInfo?.match_date ? new Date(matchInfo.match_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : "날짜 미정"}</span>
                        <span style={{ color: '#E5E7EB' }}>|</span>
                        <span>🕒 {matchInfo?.match_date ? new Date(matchInfo.match_date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : "시간 미정"}</span>
                    </div>
                    <div style={{ fontWeight: '500', color: '#4B5563', opacity: matchInfo?.status === 'DELETED' ? 0.6 : 1 }}>
                        <span>📍 {matchInfo?.home_team?.team_name ? `${matchInfo.home_team.team_name} ` : ""}{matchInfo?.match_location || "장소 미정"}</span>
                    </div>
                </div>

                {/* Bottom Row: Versus Card */}
                <div style={{
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    opacity: matchInfo?.status === 'DELETED' ? 0.6 : 1
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
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#111827' }}>{hostPlayer?.name || hostPlayer?.player_nickname || "호스트"}</span>

                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {hostPlayer?.record || "-전 -승"} / {hostPlayer?.position || "-"}
                        </span>
                    </div>

                    {/* Center: VS Badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: '900', fontStyle: 'italic',
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
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#111827' }}>
                            {applicantPlayer?.name || applicantPlayer?.player_nickname || "신청자"}
                        </span>

                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {applicantPlayer?.record || "-전 -승"} / {applicantPlayer?.position || "-"}
                        </span>
                    </div>
                </div>
            </header>

            {/* [Proxy Application Alert] */}
            {(applicantPlayer && applicantPlayer.user_id && chatRoom && chatRoom.applicant_user_id !== applicantPlayer.user_id) && (
                <div style={{
                    background: '#EFF6FF',
                    color: '#1E3A8A',
                    padding: '12px 16px',
                    fontSize: '0.85rem',
                    borderBottom: '1px solid #DBEAFE',
                    lineHeight: '1.5',
                    display: 'flex',
                    alignItems: 'start',
                    gap: '8px'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>📢</span>
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>매치 신청자와 출전 선수가 다릅니다.</div>
                        <div>현재 대화 상대는 신청자(<strong>{applicantUser?.name || applicantUser?.player_nickname || "매니저"}</strong>)입니다.</div>
                    </div>
                </div>
            )}

            {/* Message List */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, idx) => {
                    const isMyMessage = msg.sender_id === currentUserId;
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    // System messages break the visual grouping chain
                    const isPrevSystem = prevMsg && String(prevMsg.content).startsWith("system:::");

                    const showProfile = !isMyMessage && (
                        idx === 0 ||
                        prevMsg?.sender_id !== msg.sender_id ||
                        isPrevSystem
                    );
                    const profileData = !isMyMessage ? getMessageProfile(msg.sender_id) : null;

                    return (

                        <div key={msg.id || idx}>
                            {/* System Message Handler */}
                            {msg.content === "system:::match_deleted" ? (
                                <div style={{ width: '100%', margin: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                        <div style={{ padding: '0 12px', fontSize: '0.8rem', color: '#EF4444', fontWeight: 'bold' }}>
                                            호스트가 매치를 삭제했습니다
                                        </div>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                        {new Date(msg.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ) : msg.content === "system:::match_scheduled" ? (
                                <div style={{ width: '100%', margin: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                        <div style={{ padding: '0 12px', fontSize: '0.8rem', color: '#22C55E', fontWeight: 'bold' }}>
                                            매치가 성사되었습니다!
                                        </div>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                        {new Date(msg.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ) : msg.content === "system:::match_rejected" ? (
                                <div style={{ width: '100%', margin: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                        <div style={{ padding: '4px 12px', fontSize: '0.8rem', color: '#4B5563', fontWeight: 'bold', background: '#F3F4F6', borderRadius: '12px' }}>
                                            매치 신청이 거절되었습니다
                                        </div>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                        {new Date(msg.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ) : msg.content === "system:::user_left" ? (
                                <div style={{ width: '100%', margin: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                        <div style={{ padding: '0 12px', fontSize: '0.8rem', color: '#6B7280', fontWeight: 'bold' }}>
                                            {getMessageProfile(msg.sender_id)?.name || "알 수 없음"} 님이 채팅방을 나갔습니다
                                        </div>
                                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                                        {new Date(msg.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                <div
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
                            )}
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
