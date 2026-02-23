"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";

export default function MatchApplicantsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const supabase = createClient();
    const { showToast } = useToast();
    const matchId = params.id;

    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [matchInfo, setMatchInfo] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Match Info & Verify Host
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select('id, sport_type, match_date, host_user_id, match_location')
                .eq('id', matchId)
                .single();

            if (matchError || !matchData) {
                alert("매칭 정보를 찾을 수 없습니다.");
                router.back();
                return;
            }

            if (matchData.host_user_id !== user.id) {
                alert("작성자만 접근 가능합니다.");
                router.back();
                return;
            }
            setMatchInfo(matchData);

            // 2. Fetch Applicants
            const { data: apps, error } = await supabase
                .from('match_applications')
                .select(`
                    *,
                    player:players!applicant_player_id (
                        id, 
                        name, 
                        weight_class, 
                        avatar_url,
                        team_members!team_members_player_id_fkey (
                            team:teams!team_members_team_id_fkey ( id, team_name )
                        )
                    )
                `)
                .eq('match_id', matchId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Applicants Fetch Error:", error);
            } else {
                setApplicants(apps || []);
            }
            setLoading(false);
        };

        fetchData();
    }, [matchId, supabase, router]);

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

        // Update Local State
        setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        showToast(newStatus === 'ACCEPTED' ? "수락되었습니다." : "거절되었습니다.", "success");

        // Notification Logic could be added here (omitted for now as per minimal requirement)
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    const pendingApps = applicants.filter(a => a.status === 'PENDING');
    const processedApps = applicants.filter(a => a.status !== 'PENDING');

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '40px' }}>
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
                    신청자 관리
                </h1>
            </header>

            <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Pending Section */}
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
                                    onAccept={() => handleUpdateStatus(app.id, 'ACCEPTED')}
                                    onReject={() => handleUpdateStatus(app.id, 'REJECTED')}
                                    isPending={true}
                                    isTeamSport={matchInfo?.sport_type && ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'].includes(matchInfo.sport_type.toUpperCase())}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Processed Section */}
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
                                    isTeamSport={matchInfo?.sport_type && ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'].includes(matchInfo.sport_type.toUpperCase())}
                                />
                            ))}
                        </div>
                    </section>
                )}

            </main>
        </div>
    );
}

function ApplicationCard({ app, onAccept, onReject, isPending, isTeamSport }: { app: any, onAccept?: () => void, onReject?: () => void, isPending: boolean, isTeamSport?: boolean }) {
    const router = useRouter();
    const player = app.player;
    const teamName = player?.team_members?.[0]?.team?.team_name || "소속 없음";
    const teamId = player?.team_members?.[0]?.team?.id;

    return (
        <div
            style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #E5E7EB',
                cursor: 'pointer'
            }}
            onClick={() => router.push(isTeamSport && teamId ? `/team/${teamId}` : `/player/${app.applicant_player_id}`)}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                {/* Avatar */}
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
                                {player?.name || "알 수 없음"}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                                {teamName}
                            </p>
                        </div>
                        {/* Status Badge (if not pending) */}
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
                        {/* Record could be added if available, using placeholder for now */}
                    </div>
                </div>
            </div>

            {/* Message */}
            {app.message && (
                <div style={{
                    background: '#F9FAFB', padding: '12px', borderRadius: '8px',
                    fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.5',
                    marginBottom: isPending ? '20px' : '0'
                }}>
                    "{app.message}"
                </div>
            )}

            {/* Actions */}
            {isPending && (
                <div style={{ display: 'flex', gap: '12px', marginTop: app.message ? 0 : 20 }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAccept && onAccept(); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px',
                            background: 'var(--primary)', color: 'white',
                            border: 'none', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer'
                        }}
                    >
                        수락하기
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onReject && onReject(); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px',
                            background: '#F3F4F6', color: '#4B5563',
                            border: 'none', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer'
                        }}
                    >
                        거절하기
                    </button>
                </div>
            )}
        </div>
    );
}
