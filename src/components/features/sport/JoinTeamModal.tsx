"use client";

import React, { useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import styles from './JoinTeamModal.module.css';

interface JoinTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportType: string;
    playerId: string;
    onJoinRequestSent: () => void;
}

export default function JoinTeamModal({ isOpen, onClose, sportType, playerId, onJoinRequestSent }: JoinTeamModalProps) {
    const supabase = createClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [requesting, setRequesting] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setLoading(true);
        try {
            // 1. 팀 정보를 가져온다
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*')
                .eq('sport_type', sportType)
                .ilike('team_name', `%${searchTerm}%`);

            if (teamsError) throw teamsError;

            if (teamsData && teamsData.length > 0) {
                // 2. captain_id가 가리키는 players 테이블에서 선수의 이름을 직접 가져온다
                const captainIds = teamsData.map(t => t.captain_id);
                const { data: playersData } = await supabase
                    .from('players')
                    .select('id, name')
                    .in('id', captainIds);

                const combined = teamsData.map(t => ({
                    ...t,
                    captainPlayer: playersData?.find(p => p.id === t.captain_id)
                }));

                setSearchResults(combined);
            } else {
                setSearchResults([]);
            }
        } catch (e) {
            console.error("❌ 검색 에러:", e);
            alert("검색 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRequest = async (teamId: string) => {
        if (!confirm("이 팀에 가입 신청을 보내시겠습니까?")) return;

        setRequesting(teamId);
        try {
            const { error } = await supabase.from('team_requests').insert({
                player_id: playerId,
                team_id: teamId,
                status: 'pending'
            });

            if (error) throw error;

            alert("가입 신청을 보냈습니다. 캡틴의 승인을 기다려주세요.");
            onJoinRequestSent();
            onClose();
        } catch (e) {
            console.error(e);
            alert("신청 중 오류가 발생했습니다.");
        } finally {
            setRequesting(null);
        }
    };

    const isGym = ['BOXING', 'JUDO', 'MMA', 'KICKBOXING'].includes(sportType.toUpperCase());

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>{isGym ? '체육관 찾기' : '소속팀 찾기'}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.searchSection}>
                    <input
                        type="text"
                        placeholder={isGym ? "체육관 이름을 검색하세요" : "팀 이름을 검색하세요"}
                        className={styles.input}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className={styles.searchBtn} onClick={handleSearch} disabled={loading}>
                        {loading ? '검색 중...' : '검색'}
                    </button>
                </div>

                <div className={styles.resultsList}>
                    {searchResults.length === 0 ? (
                        <div className={styles.emptyState}>검색 결과가 없습니다.</div>
                    ) : (
                        searchResults.map(team => (
                            <div key={team.id} className={styles.teamItem}>
                                <div className={styles.emblem}>
                                    {team.emblem_url ? <img src={team.emblem_url} alt={team.team_name} /> : '🛡️'}
                                </div>
                                <div className={styles.info}>
                                    <div className={styles.name}>{team.team_name}</div>
                                    <div className={styles.captain}>관장(주장): {team.captainPlayer?.name || '정보 없음'}</div>
                                </div>
                                <button
                                    className={styles.joinBtn}
                                    onClick={() => handleJoinRequest(team.id)}
                                    disabled={!!requesting}
                                >
                                    {requesting === team.id ? '전송 중' : '가입 신청'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
