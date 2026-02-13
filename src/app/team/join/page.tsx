"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import styles from './join.module.css';
import { SPORTS } from '@/constants/sports';

function TeamJoinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sportNameParam = searchParams.get('sport'); // Korean name or ID

    const [sportId, setSportId] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [requesting, setRequesting] = useState<string | null>(null);

    const supabase = createClient();

    // 1. Initial Data Load & Validation
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Auth Check
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/login');
                    return;
                }

                if (!sportNameParam) {
                    alert("잘못된 접근입니다 (종목 정보 없음).");
                    router.back();
                    return;
                }

                // Map Sport Name to ID
                // Logic: Check if param matches ID first, then Name
                const matchedSport = SPORTS.find(s =>
                    s.id === sportNameParam.toUpperCase() ||
                    s.name === sportNameParam
                );

                if (!matchedSport) {
                    alert("지원하지 않는 종목입니다.");
                    router.back();
                    return;
                }

                setSportId(matchedSport.id.toLowerCase());

                // Fetch Player Profile
                const { data: playerData, error } = await supabase
                    .from('players')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('sport_type', matchedSport.id.toLowerCase())
                    .maybeSingle();

                if (error || !playerData) {
                    alert("선수 프로필이 필요합니다. 먼저 프로필을 생성해주세요.");
                    router.replace(`/profile/register/${matchedSport.id.toLowerCase()}`);
                    return;
                }

                setPlayerId(playerData.id);

            } catch (e) {
                console.error(e);
                alert("초기화 중 오류 발생");
                router.back();
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [sportNameParam, router]);

    // 2. Search Logic
    const handleSearch = async () => {
        if (!searchTerm.trim() || !sportId) return;
        setSearchLoading(true);

        try {
            // A. Search Teams
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*')
                .eq('sport_type', sportId)
                .ilike('team_name', `%${searchTerm}%`);

            if (teamsError) throw teamsError;

            if (teamsData && teamsData.length > 0) {
                // B. Fetch Captain Names
                const captainIds = teamsData.map(t => t.captain_id);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: playersData } = await (supabase.from('profiles') as any) // Use profiles for name ideally, or players?
                    // Previous logic in Modal used 'players' table for captain name if captain_id is player_id
                    // But wait, captain_id IS player_id in my DB schema? 
                    // Let's check: tasks said "captain_id FK to players.id".
                    // So I should fetch from 'players' or join it.
                    // Modal Logic:
                    /* 
                       const { data: playersData } = await supabase
                        .from('players')
                        .select('id, name')
                        .in('id', captainIds);
                    */
                    // I will stick to players table as per Modal logic
                    .select('id, name, nickname, username, full_name') // Try to get everything
                    .in('id', captainIds);

                // Oops, wait. Modal logic used `from('players')` line 40-43.
                // Let's use `players` table AND `profiles` via join if I could, but simple is better.
                // Re-read Modal: It fetches from `players`.
                // BUT `players` might not have `name` if it comes from profile?
                // `players` table HAS `name` column.

                const { data: capPlayers } = await supabase
                    .from('players')
                    .select('id, name')
                    .in('id', captainIds);

                const combined = teamsData.map(t => ({
                    ...t,
                    captainPlayer: capPlayers?.find((p: any) => p.id === t.captain_id)
                }));

                setSearchResults(combined);
            } else {
                setSearchResults([]);
            }

        } catch (e) {
            console.error("Search Error:", e);
            alert("검색 실패");
        } finally {
            setSearchLoading(false);
        }
    };

    // 3. Join Request Logic
    const handleJoinRequest = async (teamId: string) => {
        if (!playerId) return;
        if (!confirm("이 팀에 가입 신청을 보내시겠습니까?")) return;

        setRequesting(teamId);

        try {
            // Check 1: Already Member?
            const { data: memberCheck } = await supabase
                .from('team_members')
                .select('id')
                .eq('team_id', teamId)
                .eq('player_id', playerId)
                .maybeSingle();

            if (memberCheck) {
                alert("이미 소속된 팀입니다.");
                return;
            }

            // Check 2: Check Pending Request
            const { data: reqCheck } = await supabase
                .from('team_requests')
                .select('id, status')
                .eq('team_id', teamId)
                .eq('player_id', playerId)
                .eq('status', 'pending')
                .maybeSingle();

            if (reqCheck) {
                alert("이미 가입 신청 중입니다.");
                return;
            }

            // Action: Insert Request
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('team_requests') as any).insert({
                player_id: playerId,
                team_id: teamId,
                status: 'pending'
            });

            if (error) throw error;

            alert("가입 신청을 보냈습니다. 팀장의 승인을 기다려주세요.");
            router.replace('/profile'); // Return to profile

        } catch (e: any) {
            console.error(e);
            alert("신청 중 오류가 발생했습니다: " + e.message);
        } finally {
            setRequesting(null);
        }
    };

    if (loading) return <div className={styles.container}>로딩 중...</div>;

    const isGym = sportId ? ['boxing', 'judo', 'mma', 'kickboxing'].some(k => sportId.includes(k)) : false;

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>{isGym ? '체육관 찾기' : '팀 찾기'}</h1>
                <p className={styles.subtitle}>
                    {sportNameParam} 종목의 {isGym ? '체육관' : '팀'}을 검색하고 가입을 신청하세요.
                </p>
            </header>

            <div className={styles.searchSection}>
                <input
                    type="text"
                    placeholder={isGym ? "체육관 이름을 입력하세요" : "팀 이름을 입력하세요"}
                    className={styles.input}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                    className={styles.searchBtn}
                    onClick={handleSearch}
                    disabled={searchLoading}
                >
                    {searchLoading ? '...' : '검색'}
                </button>
            </div>

            <div className={styles.resultsList}>
                {searchResults.length === 0 ? (
                    <div className={styles.emptyState}>
                        {searchTerm ? "검색 결과가 없습니다." : "검색어를 입력해주세요."}
                    </div>
                ) : (
                    searchResults.map(team => (
                        <div key={team.id} className={styles.teamItem}>
                            <div className={styles.emblem}>
                                {team.emblem_url ? <img src={team.emblem_url} alt={team.team_name} /> : '🛡️'}
                            </div>
                            <div className={styles.info}>
                                <div className={styles.name}>{team.team_name}</div>
                                <div className={styles.captain}>
                                    {isGym ? '관장' : '주장'}: {team.captainPlayer?.name || '정보 없음'}
                                </div>
                                <div className={styles.desc}>{team.description}</div>
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

            <div className={styles.bottomAction}>
                <span className={styles.backLink} onClick={() => router.back()}>뒤로 가기</span>
            </div>
        </main>
    );
}

export default function TeamJoinPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TeamJoinContent />
        </Suspense>
    );
}
