import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './TeamManageModal.module.css';

interface TeamManageModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
}

interface RequestItem {
    id: string; // request id
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

export default function TeamManageModal({ isOpen, onClose, teamId }: TeamManageModalProps) {
    const [newRequests, setNewRequests] = useState<RequestItem[]>([]);
    const [pastRequests, setPastRequests] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(false);
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

        // Fetch history (approved/rejected)
        const { data: historyData } = await supabase
            .from('team_requests')
            .select('*, players(id, name, avatar_url, photo_url, weight_class, location)')
            .eq('team_id', teamId)
            .in('status', ['approved', 'rejected'])
            .order('created_at', { ascending: false })
            .limit(20); // Limit history

        if (pendingData) setNewRequests(pendingData);
        if (historyData) setPastRequests(historyData);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
        }
    }, [isOpen, teamId]);

    const handleApprove = async (requestId: string, playerId: string) => {
        // Transaction-like: Update request -> Update player
        const { error: reqError } = await supabase
            .from('team_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (!reqError) {
            await supabase
                .from('players')
                .update({ team_id: teamId })
                .eq('id', playerId);

            fetchRequests(); // Refresh
        }
    };

    const handleReject = async (requestId: string) => {
        await supabase
            .from('team_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        fetchRequests();
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

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>선수등록</h2>
                    <button onClick={onClose} className={styles.closeButton}>✕</button>
                </div>

                <div className={styles.scrollContent}>
                    {/* Section A: New Requests */}
                    <div className={styles.sectionHeader}>새 선수등록 요청!</div>
                    <div className={styles.requestList}>
                        {newRequests.length === 0 ? (
                            <div className={styles.emptyState}>새로운 요청이 없습니다.</div>
                        ) : (
                            newRequests.map(req => (
                                <div key={req.id} className={styles.requestCard}>
                                    <div className={styles.cardContent}>
                                        <div className={styles.playerInfo}>
                                            <div className={styles.avatar}>
                                                {(req.players.avatar_url || req.players.photo_url) ? (
                                                    <img src={req.players.avatar_url || req.players.photo_url} alt={req.players.name} />
                                                ) : '👤'}
                                            </div>
                                            <div className={styles.details}>
                                                <div className={styles.name}>{req.players.name}</div>
                                                <div className={styles.meta}>{req.players.weight_class} · {req.players.location || '지역미정'}</div>
                                            </div>
                                        </div>
                                        <div className={styles.actions}>
                                            <button className={styles.approveBtn} onClick={() => handleApprove(req.id, req.players.id)}>승인</button>
                                            <button className={styles.rejectBtn} onClick={() => handleReject(req.id)}>반려</button>
                                        </div>
                                    </div>
                                    <div className={styles.timestamp}>{formatRelativeTime(req.created_at)}</div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles.divider} />

                    {/* Section B: Past Requests */}
                    <div className={styles.sectionHeader}>이전 선수등록 요청</div>
                    <div className={styles.requestList}>
                        {pastRequests.length === 0 ? (
                            <div className={styles.emptyState}>이전 기록이 없습니다.</div>
                        ) : (
                            pastRequests.map(req => (
                                <div key={req.id} className={`${styles.requestCard} ${styles.pastCard}`}>
                                    <div className={styles.cardContent}>
                                        <div className={styles.playerInfo}>
                                            <div className={styles.avatar}>
                                                {(req.players.avatar_url || req.players.photo_url) ? (
                                                    <img src={req.players.avatar_url || req.players.photo_url} alt={req.players.name} />
                                                ) : '👤'}
                                            </div>
                                            <div className={styles.details}>
                                                <div className={styles.name}>{req.players.name}</div>
                                                <div className={styles.meta}>{req.players.weight_class} · {req.players.location || '지역미정'}</div>
                                            </div>
                                        </div>
                                        <div className={styles.statusBadge}>
                                            {req.status === 'approved' ? (
                                                <span className={styles.statusApproved}>승인됨</span>
                                            ) : (
                                                <span className={styles.statusRejected}>반려됨</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.timestamp}>
                                        {req.status === 'approved' ? '승인' : '반려'} · {new Date(req.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
