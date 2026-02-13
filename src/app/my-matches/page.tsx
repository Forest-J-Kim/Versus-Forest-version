"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function MyMatchesPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'HOSTED' | 'APPLIED'>('HOSTED');
    const [hostedMatches, setHostedMatches] = useState<any[]>([]);
    const [appliedMatches, setAppliedMatches] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace('/login');
                return;
            }

            // 1. 내가 주최한 매치 (Host)
            const { data: hosted } = await supabase
                .from('matches')
                .select(`
                    *,
                    home_player:players!home_player_id (
                        player_nickname, name, avatar_url
                    ),
                    match_applications ( id, status ) 
                `)
                .eq('host_user_id', user.id)
                .neq('status', 'DELETED') // 삭제된 건 제외
                .order('created_at', { ascending: false });

            if (hosted) setHostedMatches(hosted);

            // 2. 내가 신청한 매치 (Guest/Manager)
            const { data: applied } = await supabase
                .from('match_applications')
                .select(`
                    *,
                    match:matches!match_id (
                        *,
                        home_player:players!home_player_id (
                            player_nickname, name, avatar_url
                        )
                    ),
                    player:players!applicant_player_id (
                        player_nickname, name, avatar_url
                    )
                `)
                .eq('applicant_user_id', user.id)
                .order('created_at', { ascending: false });

            if (applied) {
                // [★ 수정됨] 삭제된 매치는 리스트에서 제외 (Client-side Filtering)
                const validMatches = applied.filter(app => app.match && app.match.status !== 'DELETED');
                setAppliedMatches(validMatches);
            }

            setLoading(false);
        };

        fetchData();
    }, [router, supabase]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'OPEN': return <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>모집중</span>;
            case 'SCHEDULED': return <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>성사됨</span>;
            case 'FINISHED': return <span style={{ background: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>종료됨</span>;
            case 'PENDING': return <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>대기중</span>;
            case 'ACCEPTED': return <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>수락됨</span>;
            case 'REJECTED': return <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>거절됨</span>;
            default: return null;
        }
    };

    const SPORT_LABELS: Record<string, string> = {
        BOXING: "🥊 복싱", MMA: "🤼 MMA", JIUJITSU: "🥋 주짓수",
        KICKBOXING: "🦵 킥복싱", WRESTLING: "🤼 레슬링", MUAYTHAI: "🥊 무에타이",
        SOCCER: "⚽ 축구", FUTSAL: "⚽ 풋살", BASEBALL: "⚾ 야구",
        BASKETBALL: "🏀 농구", BADMINTON: "🏸 배드민턴", TENNIS: "🎾 테니스",
        VOLLEYBALL: "🏐 배구", PINGPONG: "🏓 탁구"
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>;

    return (
        <div style={{ paddingBottom: '80px', background: '#f9fafb', minHeight: '100vh' }}>
            <header style={{ background: 'white', padding: '16px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>내 매치 관리</h1>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
                <button
                    onClick={() => setActiveTab('HOSTED')}
                    style={{
                        flex: 1, padding: '14px', border: 'none', background: 'transparent', cursor: 'pointer',
                        borderBottom: activeTab === 'HOSTED' ? '2px solid black' : 'none',
                        fontWeight: activeTab === 'HOSTED' ? 'bold' : 'normal',
                        color: activeTab === 'HOSTED' ? 'black' : '#6b7280'
                    }}
                >
                    내가 주최한 매치 ({hostedMatches.length})
                </button>
                <button
                    onClick={() => setActiveTab('APPLIED')}
                    style={{
                        flex: 1, padding: '14px', border: 'none', background: 'transparent', cursor: 'pointer',
                        borderBottom: activeTab === 'APPLIED' ? '2px solid black' : 'none',
                        fontWeight: activeTab === 'APPLIED' ? 'bold' : 'normal',
                        color: activeTab === 'APPLIED' ? 'black' : '#6b7280'
                    }}
                >
                    내가 신청한 매치 ({appliedMatches.length})
                </button>
            </div>

            {/* List Content */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* 1. HOSTED LIST */}
                {activeTab === 'HOSTED' && (
                    hostedMatches.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>주최한 매치가 없습니다.</div>
                    ) : (
                        hostedMatches.map(match => {
                            // @ts-ignore
                            const hostPlayer = match.home_player;
                            const hostName = hostPlayer?.player_nickname || hostPlayer?.name || "내 선수";
                            const applicantCount = match.match_applications ? match.match_applications.length : 0;
                            const sportLabel = SPORT_LABELS[match.sport_type] || match.sport_type;

                            return (
                                <div
                                    key={match.id}
                                    onClick={() => router.push(`/matches/${match.id}`)}
                                    style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                >
                                    {/* 1. Header: 종목 & 상태 뱃지 (Priority Logic) */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4B5563' }}>{sportLabel}</span>
                                        {(() => {
                                            // 1순위: 매치 성사 (초록색)
                                            if (match.status === 'SCHEDULED') {
                                                return (
                                                    <span style={{
                                                        background: '#DCFCE7', color: '#15803D', // 초록색 계열 (Green-100, Green-700)
                                                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
                                                    }}>
                                                        매치 성사
                                                    </span>
                                                );
                                            }
                                            // 2순위: 취소됨 (회색) - 리스트에서 제외되지만 혹시 몰라 추가
                                            if (match.status === 'CANCELLED' || match.status === 'DELETED') {
                                                return (
                                                    <span style={{
                                                        background: '#F3F4F6', color: '#6B7280',
                                                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
                                                    }}>
                                                        취소됨
                                                    </span>
                                                );
                                            }
                                            // 3순위: 신청자 있음 (대기중인 신청자만 카운트)
                                            const pendingCount = match.match_applications?.filter((a: any) => a.status === 'PENDING').length || 0;
                                            if (pendingCount > 0) {
                                                return (
                                                    <span style={{
                                                        background: '#FEF3C7', color: '#D97706',
                                                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
                                                    }}>
                                                        {pendingCount}명 신청중
                                                    </span>
                                                );
                                            }
                                            // 4순위: 기본 (모집중)
                                            return (
                                                <span style={{
                                                    background: '#F3F4F6', color: '#4B5563',
                                                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
                                                }}>
                                                    참가자 모집중
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* 2. Main: 주최 선수(나/내 선수) 프로필 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F3F4F6', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                            {hostPlayer?.avatar_url ? (
                                                <img src={hostPlayer.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👤</div>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '2px' }}>HOST (My Player)</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827' }}>{hostName}</div>
                                        </div>
                                    </div>

                                    {/* 3. Details: 장소, 날짜, 매치체급 */}
                                    <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>📍</span> {match.match_location || "장소 미정"}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>📅</span> {new Date(match.match_date).toLocaleDateString()} {new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontWeight: '600' }}>
                                            <span>⚖️</span> 매치 체급: {match.match_weight}kg
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}

                {/* 2. APPLIED LIST */}
                {activeTab === 'APPLIED' && (
                    appliedMatches.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>신청한 내역이 없습니다.</div>
                    ) : (
                        appliedMatches.map(app => {
                            const match = app.match;
                            if (!match) return null;

                            // @ts-ignore
                            const hostPlayer = match.home_player;
                            const hostName = hostPlayer?.player_nickname || hostPlayer?.name || "상대 선수";

                            // @ts-ignore
                            const applicantPlayer = app.player;
                            const applicantName = applicantPlayer?.player_nickname || applicantPlayer?.name || "내 선수";

                            const sportLabel = SPORT_LABELS[match.sport_type] || match.sport_type;

                            return (
                                <div
                                    key={app.id}
                                    onClick={() => router.push(`/matches/${match.id}`)}
                                    style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                >
                                    {/* 1. Header: 종목 & 상태 뱃지 */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4B5563' }}>{sportLabel}</span>
                                        {getStatusBadge(app.status)}
                                    </div>

                                    {/* 2. Main: [HOST] vs [MY PLAYER] 페이스오프 UI */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>

                                        {/* 좌측: 호스트 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F3F4F6', overflow: 'hidden', border: '1px solid #E5E7EB', flexShrink: 0 }}>
                                                {hostPlayer?.avatar_url ? (
                                                    <img src={hostPlayer.avatar_url} alt={hostName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👤</div>
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '2px' }}>HOST</div>
                                                <div style={{ fontSize: '1.0rem', fontWeight: 'bold', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hostName}</div>
                                            </div>
                                        </div>

                                        {/* 중앙: VS */}
                                        <div style={{ fontWeight: '900', color: '#EF4444', fontStyle: 'italic', fontSize: '1.2rem', padding: '0 10px' }}>VS</div>

                                        {/* 우측: 내 선수 (신청자) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                                            <div style={{ minWidth: 0, textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.8rem', color: '#3B82F6', marginBottom: '2px', fontWeight: '600' }}>MY PLAYER</div>
                                                <div style={{ fontSize: '1.0rem', fontWeight: 'bold', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{applicantName}</div>
                                            </div>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', overflow: 'hidden', border: '2px solid #3B82F6', flexShrink: 0 }}>
                                                {applicantPlayer?.avatar_url ? (
                                                    <img src={applicantPlayer.avatar_url} alt={applicantName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🧑✈️</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Details: 장소, 날짜, 체급 */}
                                    <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>📍</span> {match.match_location || "장소 미정"}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>📅</span> {new Date(match.match_date).toLocaleDateString()} {new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontWeight: '600' }}>
                                            <span>⚖️</span> 내 신청 체급: {app.application_weight}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>
        </div>
    );
}
