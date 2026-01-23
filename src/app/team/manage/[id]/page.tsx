"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import styles from './manage.module.css';

interface RequestItem {
    id: string;
    status: string;
    created_at: string;
    players: {
        id: string;
        name: string;
        avatar_url?: string;
        photo_url?: string;
        weight_class?: string;
        location?: string;
    }
}

export default function TeamManagePage() {
    const params = useParams(); // { id: string }
    const router = useRouter();
    const teamId = params?.id as string;

    const [newRequests, setNewRequests] = useState<RequestItem[]>([]);
    const [pastRequests, setPastRequests] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const supabase = createClient();

    const fetchRequests = async () => {
        if (!teamId) return;
        setLoading(true);

        // Fetch pending
        const { data: pendingData } = await supabase
            .from('team_requests')
            .select('*, players(id, name, avatar_url, photo_url, weight_class, location)')
            .eq('team_id', teamId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        // Fetch history
        const { data: historyData } = await supabase
            .from('team_requests')
            .select('*, players(id, name, avatar_url, photo_url, weight_class, location)')
            .eq('team_id', teamId)
            .in('status', ['approved', 'rejected'])
            .order('created_at', { ascending: false })
            .limit(30);

        if (pendingData) setNewRequests(pendingData);
        if (historyData) setPastRequests(historyData);
        setLoading(false);
    };

    useEffect(() => {
        if (teamId) {
            fetchRequests();
        }
    }, [teamId]);

    const handleApprove = async (requestId: string, playerId: string) => {
        if (processingId) return;

        // Validation Check
        if (!requestId || !playerId || !teamId) {
            alert(`ID 값이 비어서 실행할 수 없습니다: Team ${teamId}, Player ${playerId}, Request ${requestId}`);
            return;
        }

        const confirm = window.confirm("이 선수의 가입을 승인하시겠습니까?");
        if (!confirm) return;

        setProcessingId(requestId);
        try {
            // 1. Update Request Status
            const { error: reqError } = await supabase
                .from('team_requests')
                .update({ status: 'approved', updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (reqError) throw reqError;

            // 2. [New System] Add to team_members
            const { error: memberError } = await supabase
                .from('team_members')
                .insert({
                    team_id: teamId,
                    player_id: playerId,
                    role: 'MEMBER'
                });

            if (memberError) {
                // If member insert fails (e.g. duplicate), we might need to handle it.
                // But generally should throw.
                console.error("Failed to add team_member:", memberError);
                // Depending on strictness, we might want to alert, but proceed for now as we have legacy fallback.
            }

            // 3. [Legacy] Update Player's Team ID
            const { error: playerError } = await supabase
                .from('players')
                .update({ team_id: teamId })
                .eq('id', playerId);

            if (playerError) {
                // If player update fails, maybe revert request? Or just alert.
                // For MVP, alerting is critical.
                throw new Error(`요청은 승인되었으나 선수 정보 업데이트 실패: ${playerError.message}`);
            }

            alert("승인 및 팀 배정이 완료되었습니다.");
            await fetchRequests();
        } catch (error: any) {
            console.error("Approval failed:", error);
            // Show raw error message as requested
            alert(JSON.stringify(error) || error.message || "알 수 없는 오류가 발생했습니다.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId: string) => {
        if (processingId) return;

        if (!requestId) {
            alert("Request ID가 없습니다.");
            return;
        }

        const confirm = window.confirm("이 선수의 가입을 반려하시겠습니까?");
        if (!confirm) return;

        setProcessingId(requestId);
        try {
            const { error } = await supabase
                .from('team_requests')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (error) throw error;

            await fetchRequests();
        } catch (error: any) {
            console.error("Rejection failed:", error);
            alert(JSON.stringify(error) || error.message || "알 수 없는 오류가 발생했습니다.");
        } finally {
            setProcessingId(null);
        }
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}초 전`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}시간 전`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}일 전`;
    };

    if (loading) return <div className={styles.container}>로딩 중...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>←</button>
                <h1 className={styles.title}>선수등록</h1>
            </header>

            <main className={styles.content}>
                {/* New Requests Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeaderRow}>
                        <h2 className={styles.sectionTitle}>새 선수등록 요청!</h2>
                        <div className={styles.divider}></div>
                    </div>

                    <div className={styles.list}>
                        {newRequests.length === 0 ? (
                            <div className={styles.emptyState}>새로운 요청이 없습니다.</div>
                        ) : (
                            newRequests.map(req => (
                                <div key={req.id} className={styles.card}>
                                    <div className={styles.cardInner}>
                                        {/* Player Info (Reusing simplified Player Card idea) */}
                                        <div className={styles.playerInfo}>
                                            <div className={styles.avatar}>
                                                {(req.players.avatar_url || req.players.photo_url) ? (
                                                    <img src={req.players.avatar_url || req.players.photo_url} alt={req.players.name} />
                                                ) : '👤'}
                                            </div>
                                            <div className={styles.infoText}>
                                                <div className={styles.name}>{req.players.name}</div>
                                                <div className={styles.meta}>{req.players.weight_class} · {req.players.location || '지역 정보 없음'}</div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className={styles.actionButtons}>
                                            <button
                                                className={styles.approveBtn}
                                                onClick={() => handleApprove(req.id, req.players.id)}
                                                disabled={!!processingId}
                                                style={{ opacity: processingId ? 0.5 : 1 }}
                                            >
                                                {processingId === req.id ? '처리 중...' : '승인'}
                                            </button>
                                            <button
                                                className={styles.rejectBtn}
                                                onClick={() => handleReject(req.id)}
                                                disabled={!!processingId}
                                                style={{ opacity: processingId ? 0.5 : 1 }}
                                            >
                                                {processingId === req.id ? '...' : '반려'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.timestamp}>({formatRelativeTime(req.created_at)})</div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Past Requests Section */}
                <section className={styles.section} style={{ marginTop: '2rem' }}>
                    <div className={styles.sectionHeaderRow}>
                        <h2 className={styles.sectionTitle}>이전 선수등록 요청</h2>
                        <div className={styles.divider}></div>
                    </div>

                    <div className={styles.list}>
                        {pastRequests.length === 0 ? (
                            <div className={styles.emptyState}>이전 기록이 없습니다.</div>
                        ) : (
                            pastRequests.map(req => (
                                <div key={req.id} className={`${styles.card} ${styles.pastCard}`}>
                                    <div className={styles.cardInner}>
                                        <div className={styles.playerInfo}>
                                            <div className={styles.avatar}>
                                                {(req.players.avatar_url || req.players.photo_url) ? (
                                                    <img src={req.players.avatar_url || req.players.photo_url} alt={req.players.name} />
                                                ) : '👤'}
                                            </div>
                                            <div className={styles.infoText}>
                                                <div className={styles.name}>{req.players.name}</div>
                                                <div className={styles.meta}>{req.players.weight_class} · {req.players.location || '지역 정보 없음'}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.footerRow}>
                                        <span className={styles.fullDate}>
                                            {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className={req.status === 'approved' ? styles.statusApproved : styles.statusRejected}>
                                            {req.status === 'approved' ? '승인됨' : '반려됨'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
