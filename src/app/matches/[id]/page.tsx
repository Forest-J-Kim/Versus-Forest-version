"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useMode } from "@/components/providers/ModeProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function ApplyMatchPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const supabase = createClient();
    const { isManagerMode } = useMode();
    const { showToast } = useToast();

    const unwrappedParams = use(params);
    const matchId = unwrappedParams.id;

    const [match, setMatch] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form State
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [weight, setWeight] = useState("");
    const [message, setMessage] = useState("");

    const [applicants, setApplicants] = useState<any[]>([]);

    const [isHost, setIsHost] = useState(false);
    const [isCaptain, setIsCaptain] = useState(false);
    const [applicantCount, setApplicantCount] = useState(0);



    useEffect(() => {
        const init = async () => {
            // 1. Fetch Match Info
            console.log('Fetching Match ID:', matchId);

            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select(`
                    *,
                    home_player:players!home_player_id(
                        id,
                        player_nickname,
                        name,
                        avatar_url,
                        weight_class,
                        position,
                        record,
                        team_members!team_members_player_id_fkey(
                            team:teams!team_members_team_id_fkey(
                                team_name,
                                location
                            )
                        )
                    ),
                    match_weight,
                    match_type,
                    rounds,
                    gear,
                    home_team:teams!home_team_id(
                        team_name,
                        emblem_url,
                        location
                    ),
                    match_applications(id),
                    chat_rooms(id)
                `)
                .eq('id', matchId)
                .single();

            // 디버깅을 위해 결과값 로그 출력
            console.log("🔥 Fetched Match Data:", matchData);

            if (matchError || !matchData) {
                console.error("Match Fetch Error:", matchError);
                alert("매칭 정보를 불러올 수 없습니다.\n" + (matchError?.message || "Unknown Error"));
                router.back();
                return;
            }
            setMatch(matchData);

            // Set Applicant Count
            if (matchData.match_applications) {
                setApplicantCount(matchData.match_applications.length);
            }

            // A. Check User & Host Status
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);

            const isOwner = user.id === matchData.host_user_id;
            setIsHost(isOwner);

            // Always Fetch Applicants (For both Host and Guest)
            const { data: apps, error } = await supabase
                .from('match_applications')
                .select(`
                    *,
                    player:players!applicant_player_id (
                        id, 
                        name, 
                        player_nickname, 
                        user_id,
                        weight_class, 
                        avatar_url,
                        position,
                        record,
                        team_members!team_members_player_id_fkey (
                            team:teams!team_members_team_id_fkey ( team_name )
                        )
                    )
                `)
                .eq('match_id', matchId)
                .order('created_at', { ascending: false });

            if (error) console.error("Applicants Fetch Error:", error);
            else setApplicants(apps || []);

            if (isOwner && matchData.status !== 'SCHEDULED') {
                setLoading(false);
                return;
            }

            if (!isOwner && matchData.status !== 'SCHEDULED') {
                // B. Guest Logic: Fetch Candidates

                // 1. Get My Players (for ID check)
                const { data: myPlayersRaw } = await supabase
                    .from('players')
                    .select('id')
                    .eq('user_id', user.id);

                const myPlayerIds = myPlayersRaw?.map(p => p.id) || [];

                // 2. Check Leadership (Captain Check)
                let myTeamId = null;
                if (myPlayerIds.length > 0) {
                    const { data: leaderMember } = await supabase
                        .from('team_members')
                        .select('team_id')
                        .in('player_id', myPlayerIds)
                        .eq('role', 'LEADER')
                        .limit(1)
                        .maybeSingle();
                    myTeamId = leaderMember?.team_id;
                    setIsCaptain(!!myTeamId);
                }

                let finalCandidates: any[] = [];

                if (myTeamId) {
                    // Case 1: Captain -> Fetch All Team Members
                    const { data: teamMembers } = await supabase
                        .from('team_members')
                        .select('player:players!inner(id, player_nickname, name, weight_class, avatar_url, sport_type, record, position)')
                        .eq('team_id', myTeamId);

                    if (teamMembers) {
                        finalCandidates = teamMembers.map((tm: any) => tm.player);
                    }
                } else {
                    // Case 2: Solo/Member -> Fetch My Players Only
                    const { data: myPlayersFull } = await supabase
                        .from('players')
                        .select('id, player_nickname, name, weight_class, avatar_url, sport_type, record, position')
                        .eq('user_id', user.id);

                    if (myPlayersFull) {
                        finalCandidates = myPlayersFull;
                    }
                }

                // 3. Filter by Sport Type (Case Insensitive) & Unique
                const targetSport = (matchData.sport_type || '').toLowerCase();
                const filtered = finalCandidates.filter((p: any) =>
                    (p.sport_type || '').toLowerCase() === targetSport
                );

                // Deduplicate (map by id)
                const uniqueCandidates = Array.from(new Map(filtered.map(item => [item['id'], item])).values());

                setCandidates(uniqueCandidates);
            }
            setLoading(false);
            return;
        };

        init();
    }, [matchId, isManagerMode, router, supabase]);

    const handleStartChat = async (applicantUserId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // A. Check for existing chat room
        const { data: existingRoom, error: fetchError } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('match_id', matchId)
            .eq('host_id', user.id)
            .eq('applicant_user_id', applicantUserId)
            .single();

        let chatRoomId = existingRoom?.id;

        if (!chatRoomId) {
            // B. Create new chat room if not exists
            const { data: newRoom, error: createError } = await supabase
                .from('chat_rooms')
                .insert({
                    match_id: matchId,
                    host_id: user.id,
                    applicant_user_id: applicantUserId
                })
                .select()
                .single();

            if (createError) {
                alert("채팅방 생성 실패: " + createError.message);
                return;
            }
            chatRoomId = newRoom.id;
        }

        // C. Redirect to Chat Page
        router.push(`/chat/${chatRoomId}`);
    };

    const handleUpdateStatus = async (appId: string, newStatus: 'ACCEPTED' | 'REJECTED') => {
        if (!confirm(newStatus === 'ACCEPTED' ? "신청을 수락하시겠습니까?" : "신청을 거절하시겠습니까?")) return;

        const { error } = await supabase
            .from('match_applications')
            .update({ status: newStatus })
            .eq('id', appId);

        if (error) {
            alert("처리 중 오류 발생: " + error.message);
            return;
        }

        if (newStatus === 'ACCEPTED') {
            // 1. Update Match Status
            await supabase.from('matches').update({ status: 'SCHEDULED' }).eq('id', matchId);
            setMatch((prev: any) => ({ ...prev, status: 'SCHEDULED' }));

            // 2. Send System Message
            const applicant = applicants.find(a => a.id === appId);
            if (applicant) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Ensure Chat Room exists
                    let chatRoomId = match.chat_rooms?.[0]?.id;

                    if (!chatRoomId) {
                        const { data: existingRoom } = await supabase
                            .from('chat_rooms')
                            .select('id')
                            .eq('match_id', matchId)
                            .eq('host_id', user.id)
                            .eq('applicant_user_id', applicant.applicant_user_id)
                            .single();

                        if (existingRoom) {
                            chatRoomId = existingRoom.id;
                        } else {
                            const { data: newRoom } = await supabase
                                .from('chat_rooms')
                                .insert({
                                    match_id: matchId,
                                    host_id: user.id,
                                    applicant_user_id: applicant.applicant_user_id
                                })
                                .select()
                                .single();
                            if (newRoom) chatRoomId = newRoom.id;
                        }
                    }

                    if (chatRoomId) {
                        await supabase.from('messages').insert({
                            chat_room_id: chatRoomId,
                            sender_id: user.id,
                            content: "system:::match_scheduled"
                        });
                    }
                }
            }


            // 3. Auto-Reject Other Applicants
            const acceptedApplicant = applicants.find(a => a.id === appId);
            if (acceptedApplicant) {
                const { error: rejectError } = await supabase
                    .from('match_applications')
                    .update({ status: 'REJECTED' })
                    .eq('match_id', matchId)
                    .neq('applicant_user_id', acceptedApplicant.applicant_user_id) // Exclude the accepted one
                    .eq('status', 'PENDING'); // Only pending ones

                if (rejectError) {
                    console.error("Auto-Reject Error:", rejectError);
                } else {
                    // [Added] Send System Message to Auto-Rejected Applicants
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: rejectedRooms } = await supabase
                            .from('chat_rooms')
                            .select('id')
                            .eq('match_id', matchId)
                            .neq('applicant_user_id', acceptedApplicant.applicant_user_id)
                            .eq('host_id', user.id); // Ensure we are host

                        if (rejectedRooms && rejectedRooms.length > 0) {
                            const messages = rejectedRooms.map(room => ({
                                chat_room_id: room.id,
                                sender_id: user.id,
                                content: "system:::match_rejected"
                            }));

                            await supabase.from('messages').insert(messages);
                        }
                    }

                    // Update local state to reflect rejections
                    setApplicants(prev => prev.map(a =>
                        (a.id !== appId && a.status === 'PENDING')
                            ? { ...a, status: 'REJECTED' }
                            : a
                    ));
                }
            }
        } else if (newStatus === 'REJECTED') {
            const applicant = applicants.find(a => a.id === appId);
            if (applicant) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Check if chat room exists
                    const { data: existingRoom } = await supabase
                        .from('chat_rooms')
                        .select('id')
                        .eq('match_id', matchId)
                        .eq('host_id', user.id)
                        .eq('applicant_user_id', applicant.applicant_user_id)
                        .maybeSingle();

                    if (existingRoom) {
                        await supabase.from('messages').insert({
                            chat_room_id: existingRoom.id,
                            sender_id: user.id,
                            content: "system:::match_rejected"
                        });
                    }
                }
            }
        }

        setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        showToast(newStatus === 'ACCEPTED' ? "수락되었습니다." : "거절되었습니다.", "success");
    };

    const handleCancelApplication = async (appId: string) => {
        if (!confirm("정말 신청을 취소하시겠습니까?")) return;

        const { error } = await supabase
            .from('match_applications')
            .delete()
            .eq('id', appId);

        if (error) {
            alert("취소 중 오류 발생: " + error.message);
            return;
        }

        setApplicants(prev => prev.filter(a => a.id !== appId));
        showToast("신청이 취소되었습니다.", "success");
    };

    const handleSubmit = async () => {
        if (selectedPlayerIds.length === 0) return alert("출전할 선수를 1명 이상 선택해주세요.");
        // Weight check? If multiple, maybe optional or applies to all?
        // Let's assume input weight applies to all for now, or make it optional if logic allows. 
        // User request: "입력된 '신청 체급'과 '한마디(Message)'는 선택된 모든 선수에게 동일하게 적용한다."
        if (!weight) return alert("신청 체급을 입력해주세요.");

        if (!confirm(`${selectedPlayerIds.length}명의 선수를 일괄 신청하시겠습니까?`)) return;

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("로그인이 필요합니다.");

        try {
            const promises = selectedPlayerIds.map(pid =>
                supabase.from('match_applications').insert({
                    match_id: matchId,
                    applicant_user_id: user.id,
                    applicant_player_id: pid,
                    application_weight: weight,
                    message: message,
                    status: 'PENDING'
                })
            );

            await Promise.all(promises);

            // B. Insert Notification (Once for the host? Or per application? let's do once)
            if (match.host_user_id) {
                await supabase.from('notifications').insert({
                    receiver_id: match.host_user_id,
                    type: 'MATCH_APPLY',
                    content: `새로운 매칭 신청이 도착했습니다. (${selectedPlayerIds.length}명)`,
                    redirect_url: `/matches`,
                    is_read: false
                });
            }

            showToast(`${selectedPlayerIds.length}명의 신청이 완료되었습니다!`, "success");
            router.push('/matches'); // Or reload? Plan said reload. But router push is fine.
            // window.location.reload(); // Redirecting to list is safer to see status? 
            // Actually router.push('/matches') is existing behavior. Keep it.
        } catch (e: any) {
            console.error("Apply Error:", e);
            alert("신청 중 오류 발생: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    // --- SCHEDULED MODE VIEW ---
    if (match.status === 'SCHEDULED') {
        const acceptedApp = applicants.find(a => a.status === 'ACCEPTED');
        const rejectedApps = applicants.filter(a => a.status === 'REJECTED');
        const chatRoomId = match.chat_rooms?.[0]?.id;

        return (
            <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '40px' }}>
                <header style={{
                    background: 'white', borderBottom: '1px solid #E5E7EB', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100
                }}>
                    <button onClick={() => router.back()} style={{
                        padding: '8px', marginRight: '8px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1
                    }}>←</button>
                    <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>성사된 매치</h1>
                </header>

                <main style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* VS Match Card (New) */}
                    <section style={{
                        padding: '3px',
                        background: 'linear-gradient(to right, #EF4444, #3B82F6)',
                        borderRadius: '16px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ background: 'white', borderRadius: '13px', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                            {/* Top: Emblem */}
                            <div style={{ width: '60px', height: '60px', marginBottom: '16px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {match.home_team?.emblem_url ? <img src={match.home_team.emblem_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏆'}
                            </div>

                            {/* Date & Location */}
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>
                                    {new Date(match.match_date).toLocaleDateString()} {new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: '500' }}>{match.home_team?.location || match.match_location || "장소 미정"}</p>
                            </div>

                            {/* VS Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', width: '100%', gap: '12px', alignItems: 'center' }}>

                                {/* Red Corner (Host) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #EF4444', padding: '2px', marginBottom: '8px' }}>
                                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#F3F4F6' }}>
                                            {match.home_player?.avatar_url ? <img src={match.home_player.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#111827', marginBottom: '4px' }}>
                                        {match.home_player?.name || "Host"}
                                    </span>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span>{match.home_player?.weight_class ? `${match.home_player.weight_class}kg` : '-'}</span>
                                        <span>{match.home_player?.position || '-'}</span>
                                        <span>{match.home_player?.record || '-'}</span>
                                    </div>
                                </div>

                                {/* VS Text */}
                                <div style={{ fontSize: '3rem', fontStyle: 'italic', fontWeight: '900', color: '#111827', textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
                                    VS
                                </div>

                                {/* Blue Corner (Opponent) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #3B82F6', padding: '2px', marginBottom: '8px' }}>
                                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#F3F4F6' }}>
                                            {acceptedApp?.player?.avatar_url ? <img src={acceptedApp.player.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#111827', marginBottom: '4px' }}>
                                        {acceptedApp?.player?.name || "Opponent"}
                                    </span>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span>{acceptedApp?.player?.weight_class ? `${acceptedApp.player.weight_class}kg` : '-'}</span>
                                        <span>{acceptedApp?.player?.position || '-'}</span>
                                        <span>{acceptedApp?.player?.record || '-'}</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </section>

                    {/* New Section: Match Detail Info */}
                    <section style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB', padding: '20px' }}>
                        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', marginBottom: '12px' }}>매치 상세 정보</h2>

                        {/* Specs Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>체급</span>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_weight ? `${match.match_weight}kg` : '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>스파링</span>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_type || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>라운드</span>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.rounds ? `${match.rounds}R` : '-'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>보호구</span>
                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.gear || '-'}</span>
                            </div>
                        </div>

                        {/* Tags */}
                        {match.tags && match.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {match.tags.map((tag: string) => (
                                    <span key={tag} style={{
                                        background: '#F3F4F6', color: '#4B5563', fontSize: '0.8rem',
                                        padding: '6px 10px', borderRadius: '8px', fontWeight: '500'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            {match.description ? (
                                <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {match.description}
                                </p>
                            ) : (
                                <p style={{ fontSize: '0.9rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                    등록된 상세 내용이 없습니다.
                                </p>
                            )}
                        </div>
                    </section>



                    {/* Chat Button */}
                    {acceptedApp && (
                        <button
                            onClick={() => {
                                if (chatRoomId) router.push(`/chat/${chatRoomId}`);
                                else handleStartChat(acceptedApp.applicant_user_id);
                            }}
                            style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#2563EB', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        >
                            <span>💬</span> 채팅방 이동하기
                        </button>
                    )}

                    {/* 3. Rejected List (Host Only) */}
                    {isHost && rejectedApps.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6B7280', marginBottom: '16px' }}>거절한 매치 상대</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.7 }}>
                                {rejectedApps.map(app => (
                                    <ApplicationCard key={app.id} app={app} isPending={false} isHost={true} />
                                ))}
                            </div>
                        </section>
                    )}

                </main>
            </div>
        );
    }
    // --- END SCHEDULED VIEW ---

    const pendingApps = applicants.filter(a => a.status === 'PENDING');
    const processedApps = applicants.filter(a => a.status !== 'PENDING');

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '140px' }}>
            {/* ... (Original Render for Pending/Apply) ... */}
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #E5E7EB',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 100
            }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        padding: '8px', marginRight: '8px', borderRadius: '50%',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        fontSize: '1.25rem', lineHeight: 1
                    }}
                >
                    ←
                </button>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
                    매치 상세 정보
                </h1>
            </header>

            <main style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Match Host Info (Card) - Always Visible */}
                <section style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    border: '1px solid #E5E7EB',
                    padding: '20px'
                }}>
                    <h2 style={{
                        fontSize: '0.875rem', fontWeight: 600, color: '#6B7280',
                        marginBottom: '12px', display: 'flex', alignItems: 'center'
                    }}>
                        <span style={{
                            background: '#EFF6FF', color: 'var(--primary)',
                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', marginRight: '8px'
                        }}>HOST</span>
                        상대 정보
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        {/* Avatar Placeholder */}
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: '#F3F4F6', border: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                            overflow: 'hidden'
                        }}>
                            {(match.home_player?.avatar_url) ? (
                                <img
                                    src={match.home_player?.avatar_url}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : '🛡️'}
                        </div>
                        <div>
                            <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', lineHeight: '1.2' }}>
                                {match.home_player?.player_nickname || match.home_player?.name || "알 수 없음"}
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' }}>
                                {match.home_player?.team_members?.[0]?.team?.team_name || "소속 없음"}
                            </p>
                        </div>
                    </div>

                    <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', color: '#374151', fontSize: '0.9rem' }}>
                            <span style={{ width: '24px', marginRight: '8px', textAlign: 'center' }}>📅</span>
                            <span style={{ fontWeight: 500 }}>{new Date(match.match_date).toLocaleDateString()}</span>
                            <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
                            <span>{new Date(match.match_date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        </div>
                        <div style={{ display: 'flex', color: '#374151', fontSize: '0.9rem', alignItems: 'flex-start' }}>
                            <span style={{ width: '24px', marginRight: '8px', textAlign: 'center', marginTop: '1px' }}>📍</span>
                            <span style={{ lineHeight: '1.4' }}>
                                {match.match_location || "장소 미정"}
                            </span>
                        </div>
                    </div>
                </section>

                {/* New Section: Match Detail Info */}
                <section style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB', padding: '20px' }}>
                    <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', marginBottom: '12px' }}>매치 상세 정보</h2>

                    {/* Specs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>체급</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_weight ? `${match.match_weight}kg` : '-'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>스파링</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_type || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>라운드</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.rounds ? `${match.rounds}R` : '-'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>보호구</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.gear || '-'}</span>
                        </div>
                    </div>

                    {/* Tags */}
                    {match.tags && match.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            {match.tags.map((tag: string) => (
                                <span key={tag} style={{
                                    background: '#F3F4F6', color: '#4B5563', fontSize: '0.8rem',
                                    padding: '6px 10px', borderRadius: '8px', fontWeight: '500'
                                }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        {match.description ? (
                            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {match.description}
                            </p>
                        ) : (
                            <p style={{ fontSize: '0.9rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                등록된 상세 내용이 없습니다.
                            </p>
                        )}
                    </div>
                </section>

                {/* Application Form - Hide if Host */}
                {/* Application Form Placeholder - Link to Apply Page */}


                {/* Applicants List - Always Visible */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Pending Applications Section */}
                    <section>
                        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                            대기 중인 신청
                            <span style={{ color: 'var(--primary)' }}>{pendingApps.length}건</span>
                        </h2>

                        {pendingApps.length === 0 ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF', background: 'white', borderRadius: '12px' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                                <p>새로운 신청이 없습니다.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {pendingApps.map(app => (
                                    <ApplicationCard
                                        key={app.id}
                                        app={app}
                                        onChat={() => handleStartChat(app.applicant_user_id)}
                                        onAccept={() => handleUpdateStatus(app.id, 'ACCEPTED')}
                                        onReject={() => handleUpdateStatus(app.id, 'REJECTED')}
                                        onCancel={(currentUser?.id === app.applicant_user_id || currentUser?.id === app.player?.user_id) ? () => handleCancelApplication(app.id) : undefined}
                                        isPending={true}
                                        isHost={isHost}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Processed (Rejected/Accepted) List */}
                    {processedApps.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6B7280', marginBottom: '16px' }}>
                                처리된 목록
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.8 }}>
                                {processedApps.map(app => (
                                    <ApplicationCard
                                        key={app.id}
                                        app={app}
                                        isPending={false}
                                        isHost={isHost}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Application Form Placeholder - Link to Apply Page (Moved to Bottom) */}
                {!isHost && isCaptain && (
                    <section style={{
                        background: 'white', borderRadius: '16px', padding: '24px',
                        textAlign: 'center', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        marginTop: '16px'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                            매치에 추가 참여신청을 하시고 싶으신가요?
                        </h3>
                        <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '0.85rem' }}>
                            관장님은 산하 선수의 추가 신청을 할 수 있습니다.
                        </p>
                        <button
                            onClick={() => router.push(`/matches/${matchId}/apply`)}
                            style={{
                                background: 'var(--primary)', color: 'white',
                                padding: '14px 24px', borderRadius: '12px',
                                fontSize: '1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            매칭 추가 신청하러 가기
                        </button>
                    </section>
                )}
            </main>

            {/* Bottom CTA */}

        </div>
    );
}

function ApplicationCard({ app, onChat, onAccept, onReject, onCancel, isPending, isHost }: { app: any, onChat?: () => void, onAccept?: () => void, onReject?: () => void, onCancel?: () => void, isPending: boolean, isHost: boolean }) {
    const player = app.player;
    const teamName = player?.team_members?.[0]?.team?.team_name || "소속 없음";

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid #E5E7EB'
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: '#F3F4F6', overflow: 'hidden', flexShrink: 0
                }}>
                    {player?.avatar_url ? (
                        <img src={player.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👤</div>
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                                {player?.player_nickname || player?.name || "알 수 없음"}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                                {teamName}
                            </p>
                        </div>
                        {!isPending && (
                            <span style={{
                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                                background: app.status === 'ACCEPTED' ? '#ECFDF5' : '#F3F4F6',
                                color: app.status === 'ACCEPTED' ? '#059669' : '#9CA3AF'
                            }}>
                                {app.status === 'ACCEPTED' ? '승인됨' : '거절됨'}
                            </span>
                        )}

                        {/* Cancel Button (For Applicant) */}
                        {isPending && onCancel && (
                            <button
                                onClick={onCancel}
                                style={{
                                    border: 'none', background: '#F3F4F6',
                                    color: '#6B7280', fontSize: '0.8rem', cursor: 'pointer',
                                    padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold',
                                    marginLeft: '8px', transition: 'all 0.2s'
                                }}
                            >
                                신청취소
                            </button>
                        )}
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '0.9rem' }}>
                        <span style={{ background: '#F9FAFB', padding: '4px 8px', borderRadius: '6px', color: '#374151' }}>
                            체급: {app.application_weight || player?.weight_class || '-'}
                        </span>
                    </div>
                </div>
            </div>

            {app.message && (
                <div style={{
                    background: '#F9FAFB', padding: '12px', borderRadius: '8px',
                    fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.5',
                    marginBottom: isPending && isHost ? '20px' : '0'
                }}>
                    "{app.message}"
                </div>
            )}

            {isPending && isHost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: app.message ? 0 : 20 }}>
                    <button
                        onClick={onChat}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '10px',
                            background: 'var(--primary)', color: 'white',
                            border: 'none', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <span>💬</span> 대화하기
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onAccept}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '10px',
                                background: 'white', color: '#059669',
                                border: '1px solid #D1FAE5', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                            }}
                        >
                            ✅ 수락
                        </button>
                        <button
                            onClick={onReject}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '10px',
                                background: 'white', color: '#EF4444',
                                border: '1px solid #FEE2E2', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                            }}
                        >
                            ❌ 거절
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
}
