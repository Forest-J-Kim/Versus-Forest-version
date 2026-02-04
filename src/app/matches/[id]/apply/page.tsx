"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useMode } from "@/components/providers/ModeProvider";
import { useToast } from "@/components/providers/ToastProvider";

export default function ApplyMatchPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const supabase = createClient();
    const { isManagerMode } = useMode();
    const { showToast } = useToast();

    const [match, setMatch] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedPlayerId, setSelectedPlayerId] = useState("");
    const [weight, setWeight] = useState("");
    const [message, setMessage] = useState("");

    const [applicants, setApplicants] = useState<any[]>([]);

    const [isHost, setIsHost] = useState(false);
    const [applicantCount, setApplicantCount] = useState(0);

    const matchId = params.id;

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
                        team_members!team_members_player_id_fkey(
                            team:teams!team_members_team_id_fkey(
                                team_name,
                                location
                            )
                        )
                    ),
                    match_applications(count)
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
            if (matchData.match_applications && matchData.match_applications[0]) {
                setApplicantCount(matchData.match_applications[0].count);
            }

            // A. Check User & Host Status
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const isOwner = user.id === matchData.host_user_id;
            setIsHost(isOwner);

            if (isOwner) {
                // Host Logic: Fetch Applicants
                const { data: apps, error } = await supabase
                    .from('match_applications')
                    .select(`
                        *,
                        player:players!applicant_player_id (
                            id, 
                            name, 
                            player_nickname, 
                            weight_class, 
                            avatar_url,
                            team_members!team_members_player_id_fkey (
                                team:teams!team_members_team_id_fkey ( team_name )
                            )
                        )
                    `)
                    .eq('match_id', matchId)
                    .order('created_at', { ascending: false });

                if (error) console.error("Applicants Fetch Error:", error);
                else setApplicants(apps || []);

                setLoading(false);
                return;
            }

            // B. Guest Logic: Fetch Candidates
            if (isManagerMode) {
                // Fetch Gym Members
                const { data: myProfile } = await supabase.from('profiles').select('team_id').eq('user_id', user.id).single();
                if (myProfile?.team_id) {
                    const { data: teamMembers } = await supabase
                        .from('team_members')
                        .select('player:players!inner(id, player_nickname, weight_class, avatar_url, sport_type)')
                        .eq('team_id', myProfile.team_id)
                        .eq('player.sport_type', matchData.sport_type);

                    if (teamMembers) {
                        const validMembers = teamMembers
                            .map((tm: any) => tm.player)
                            .filter((p: any) => p.sport_type?.toLowerCase() === matchData.sport_type?.toLowerCase());
                        setCandidates(validMembers);
                    }
                }
            } else {
                // Solo Mode: Fetch my players
                const { data: myPlayers } = await supabase
                    .from('players')
                    .select('id, player_nickname, name, weight_class, avatar_url')
                    .eq('user_id', user.id)
                    .ilike('sport_type', matchData.sport_type);
                if (myPlayers) setCandidates(myPlayers);
            }
            setLoading(false);
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

        setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        showToast(newStatus === 'ACCEPTED' ? "수락되었습니다." : "거절되었습니다.", "success");
    };

    const handleSubmit = async () => {
        if (!selectedPlayerId) return alert("출전할 선수를 선택해주세요.");
        if (!weight) return alert("체급을 입력해주세요.");

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        // A. Insert Application
        const { error: applyError } = await supabase.from('match_applications').insert({
            match_id: matchId,
            applicant_user_id: user?.id,
            applicant_player_id: selectedPlayerId,
            application_weight: weight,
            message: message,
            status: 'PENDING'
        });

        if (applyError) {
            alert("신청 중 오류 발생: " + applyError.message);
            setSubmitting(false);
            return;
        }

        // B. Insert Notification
        if (match.host_user_id) {
            await supabase.from('notifications').insert({
                receiver_id: match.host_user_id,
                type: 'MATCH_APPLY',
                content: "새로운 매칭 신청이 도착했습니다.",
                redirect_url: `/matches`, // To be updated later
                is_read: false
            });
        }

        showToast("신청이 완료되었습니다!", "success");
        router.push('/matches');
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    const pendingApps = applicants.filter(a => a.status === 'PENDING');
    const processedApps = applicants.filter(a => a.status !== 'PENDING');

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '140px' }}>
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
                    {isHost ? "매칭 관리" : "매칭 신청하기"}
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

                {/* Application Form - Hide if Host */}
                {!isHost && (
                    <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                                출전 선수 선택
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    style={{
                                        width: '100%', appearance: 'none', backgroundColor: 'white',
                                        border: '1px solid #E5E7EB', borderRadius: '12px',
                                        padding: '14px 16px', fontSize: '1rem', color: '#111827',
                                        outline: 'none'
                                    }}
                                    value={selectedPlayerId}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        setSelectedPlayerId(pid);
                                        const p = candidates.find(c => c.id === pid);
                                        if (p && p.weight_class) setWeight(p.weight_class);
                                    }}
                                >
                                    <option value="">선수를 선택하세요</option>
                                    {candidates.map(p => (
                                        <option key={p.id} value={p.id}>{p.player_nickname || p.name} ({p.weight_class || '-'})</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9CA3AF' }}>▼</div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                                신청 체급 / 체중
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: '100%', backgroundColor: 'white',
                                    border: '1px solid #E5E7EB', borderRadius: '12px',
                                    padding: '14px 16px', fontSize: '1rem', color: '#111827',
                                    outline: 'none'
                                }}
                                placeholder="예: -70kg 또는 68kg"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                                한마디 (Message)
                            </label>
                            <textarea
                                style={{
                                    width: '100%', backgroundColor: 'white',
                                    border: '1px solid #E5E7EB', borderRadius: '12px',
                                    padding: '14px 16px', fontSize: '1rem', color: '#111827',
                                    outline: 'none', resize: 'none', minHeight: '120px'
                                }}
                                placeholder="상대방에게 간단한 인사나 매칭 조건을 남겨주세요."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                    </section>
                )}

                {/* Host Info if Host */}
                {isHost && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
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
                                            isPending={true}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

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
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            {/* Bottom CTA */}
            {!isHost && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    backgroundColor: 'white', borderTop: '1px solid #F3F4F6',
                    padding: '16px 20px 32px 20px',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', zIndex: 50
                }}>
                    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                width: '100%', padding: '16px', borderRadius: '14px',
                                backgroundColor: submitting ? '#D1D5DB' : 'var(--primary)',
                                color: 'white', fontSize: '1.1rem', fontWeight: 'bold',
                                border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                                boxShadow: submitting ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {submitting ? "처리 중..." : "신청서 제출하기"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ApplicationCard({ app, onChat, onAccept, onReject, isPending }: { app: any, onChat?: () => void, onAccept?: () => void, onReject?: () => void, isPending: boolean }) {
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
                    marginBottom: isPending ? '20px' : '0'
                }}>
                    "{app.message}"
                </div>
            )}

            {isPending && (
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
