"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import styles from "./team.module.css";

interface PageProps {
    params: Promise<{ teamId: string }>;
}

export default function TeamDetailPage({ params }: PageProps) {
    const router = useRouter();
    const resolvedParams = use(params);
    const teamId = resolvedParams.teamId;
    const supabase = createClient();

    const [team, setTeam] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            // 1. Fetch Team Details
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (teamError) {
                console.error(teamError);
                setLoading(false);
                return;
            }

            // 2. Fetch Members (Players)
            const { data: playersData } = await supabase
                .from('players')
                .select('*')
                .eq('team_id', teamId);

            // 3. Fetch Captain Data (separately)
            let captainPlayer = null;
            let captainProfileName = '정보 없음';

            if (teamData.captain_id) {
                // A. Fetch Profile Name for Header
                const { data: capProfile } = await supabase
                    .from('profiles')
                    .select('nickname, username, full_name')
                    .eq('id', teamData.captain_id)
                    .single();

                if (capProfile) {
                    captainProfileName = capProfile.nickname || capProfile.username || capProfile.full_name || '정보 없음';
                }

                // B. Fetch Player Data for Member List
                const { data: capData } = await supabase
                    .from('players')
                    .select('*')
                    .eq('user_id', teamData.captain_id)
                    .eq('sport_type', teamData.sport_type) // Ensure matching sport profile
                    .maybeSingle();
                captainPlayer = capData;
            }

            // Add Captain Name to team object for display
            teamData.captain_name = captainProfileName;

            // Merge Captain into Players List
            let allPlayers = playersData || [];
            if (captainPlayer) {
                const exists = allPlayers.find(p => p.id === captainPlayer.id);
                if (!exists) {
                    allPlayers = [captainPlayer, ...allPlayers];
                } else {
                    allPlayers = [captainPlayer, ...allPlayers.filter(p => p.id !== captainPlayer.id)];
                }
            }

            setTeam(teamData);
            setPlayers(allPlayers);
            setLoading(false);
        };

        fetchData();
    }, [teamId]);

    if (loading) return <div className={styles.container}>로딩 중...</div>;
    if (!team) return <div className={styles.container}>팀 정보를 찾을 수 없습니다.</div>;

    const isCaptain = currentUserId === team.captain_id;
    // Determine Type
    const isTeamSport = ['soccer', 'foot', 'futsal', 'base', 'basket', 'volley', 'jokgu'].some(k => team.sport_type?.toLowerCase().includes(k));

    // Parse JSONB fields (defensively)
    const matchHistory = Array.isArray(team.match_history) ? team.match_history : [];
    const coachesInfo = Array.isArray(team.coaches_info) ? team.coaches_info : [];

    // Placeholder data for demo if empty
    const displayMatchHistory = matchHistory.length > 0 ? matchHistory : [
        { date: '2026-01-24', opponent: '상대팀', score: '3 : 1', result: 'WIN' },
        { date: '2026-01-21', opponent: '상대팀', score: '2 : 4', result: 'LOSS' }
    ];

    const displayCoaches = coachesInfo.length > 0 ? coachesInfo : [
        { name: '강펀치', style: '인파이터', career: '현 리엔케이 복싱클럽 코치\n전 ㅇㅇㅇ 복싱짐 코치', photoUrl: null }
    ];

    return (
        <main className={styles.container}>
            <div className={styles.topHeader}>
                <h2 className={styles.pageTitle}>팀 프로필</h2>
                {isCaptain && (
                    <button
                        className={styles.editButton}
                        onClick={() => router.push(`/team/edit/${teamId}`)}
                    >
                        수정
                    </button>
                )}
            </div>

            {/* Header */}
            <header className={styles.header}>

                <div className={styles.headerContent}>
                    <div className={styles.emblem}>
                        {team.emblem_url ? (
                            <img src={team.emblem_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : '🛡️'}
                    </div>

                    <div className={styles.teamInfo}>
                        <h1 className={styles.teamName}>{team.team_name}</h1>
                        <p className={styles.teamDesc}>{team.description || '한줄 소개가 없습니다.'}</p>

                        <div className={styles.metaInfo}>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>{isTeamSport ? '주장' : '관장'}:</span>
                                <span className={styles.metaValue}>
                                    {players.find(p => p.user_id === team.captain_id)?.name || '정보 없음'}
                                </span>
                            </div>
                            {isTeamSport && (
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>평점:</span>
                                    <span className={styles.stars}>{"★".repeat(Math.floor(team.rating || 5))}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Team Introduction Section (Detailed) */}
            <section className={styles.section}>
                <h3 className={styles.subTitle}>팀 소개</h3>
                <div className={styles.descriptionBox}>
                    {team.introduction ? team.introduction : (
                        <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                            {isCaptain ? "팀 소개글을 작성해주세요." : "아직 팀 소개글이 없습니다."}
                        </span>
                    )}
                </div>
            </section>

            {/* Content Switch */}
            {isTeamSport ? (
                /* TYPE A: Team Sport */
                <>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Best 11</h2>

                        {/* Soccer Pitch Visualizer */}
                        <div className={styles.pitchContainer}>
                            <div className={styles.pitchLineMid}></div>
                            <div className={styles.pitchCircle}></div>
                            <div className={styles.pitchBoxTop}></div>
                            <div className={styles.pitchBoxBottom}></div>

                            {/* Formation Nodes (4-3-3 Mockup) - Using Saved Formation Data */}
                            {/* Formation keys: gk, lb, lcb, rcb, rb, lcm, cdm, rcm, lw, st, rw */}

                            {/* GK */}
                            <FormationNode top="90%" left="50%" label="GK" player={players.find(p => p.id === (team.formation?.gk))} />

                            {/* DF */}
                            <FormationNode top="75%" left="15%" label="LB" player={players.find(p => p.id === (team.formation?.lb))} />
                            <FormationNode top="80%" left="38%" label="CB" player={players.find(p => p.id === (team.formation?.lcb))} />
                            <FormationNode top="80%" left="62%" label="CB" player={players.find(p => p.id === (team.formation?.rcb))} />
                            <FormationNode top="75%" left="85%" label="RB" player={players.find(p => p.id === (team.formation?.rb))} />

                            {/* MF */}
                            <FormationNode top="55%" left="30%" label="LCM" player={players.find(p => p.id === (team.formation?.lcm))} />
                            <FormationNode top="60%" left="50%" label="CDM" player={players.find(p => p.id === (team.formation?.cdm))} />
                            <FormationNode top="55%" left="70%" label="RCM" player={players.find(p => p.id === (team.formation?.rcm))} />

                            {/* FW */}
                            <FormationNode top="25%" left="20%" label="LW" player={players.find(p => p.id === (team.formation?.lw))} />
                            <FormationNode top="15%" left="50%" label="ST" player={players.find(p => p.id === (team.formation?.st))} />
                            <FormationNode top="25%" left="80%" label="RW" player={players.find(p => p.id === (team.formation?.rw))} />
                        </div>
                    </section>

                    <section className={styles.section}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>선수 명단</h2>
                            <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>총 {players.length}명</span>
                        </div>

                        <div className={styles.memberGrid2Col}>
                            {players.map(player => {
                                const pos = player.skills?.position || '-';
                                return (
                                    <div key={player.id} className={styles.memberCard}>
                                        <div className={styles.memberPos}>{pos}</div>
                                        <img
                                            src={player.avatar_url || player.photo_url || 'https://via.placeholder.com/40'}
                                            alt={player.name}
                                            className={styles.memberAvatarSmall}
                                        />
                                        <div className={styles.memberNameBox}>
                                            <span className={styles.memberNameText}>{player.name}</span>
                                            {player.user_id === team.captain_id && (
                                                <span className={styles.captainBadge}>C</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>최근 전적</h2>
                        <div className={styles.matchList}>
                            {displayMatchHistory.map((match: any, idx: number) => (
                                <div key={idx} className={styles.matchCard}>
                                    <div>
                                        <div className={styles.matchDate}>{match.date}</div>
                                        <div style={{ fontWeight: 'bold' }}>VS {match.opponent}</div>
                                    </div>
                                    <div className={styles.matchContent}>
                                        <div className={styles.score}>{match.score}</div>
                                        <div className={`${styles.resultBadge} ${match.result === 'WIN' ? styles.win : match.result === 'LOSS' ? styles.loss : styles.draw}`}>
                                            {match.result === 'WIN' ? '승' : match.result === 'LOSS' ? '패' : '무'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            ) : (
                /* TYPE B: Gym/Individual Sport */
                <>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>코치진 정보</h2>
                        {displayCoaches.map((coach: any, idx: number) => (
                            <div key={idx} className={styles.coachCard}>
                                <div className={styles.coachImage}>
                                    {coach.photoUrl ? <img src={coach.photoUrl} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                                </div>
                                <div className={styles.coachInfo}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{coach.name} <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>{coach.style}</span></div>
                                    <div style={{ fontSize: '0.85rem', color: '#555', whiteSpace: 'pre-line' }}>{coach.career}</div>
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>회원 목록 ({players.length})</h2>
                        <div className={styles.membersGrid}>
                            {players.map(player => (
                                <div key={player.id} className={styles.memberItem}>
                                    <div className={styles.memberAvatar} style={{ position: 'relative' }}>
                                        {(player.avatar_url || player.photo_url) ? (
                                            <img src={player.avatar_url || player.photo_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ccc' }}>👤</div>
                                        )}
                                        {/* Highlight Captain */}
                                        {player.user_id === team.captain_id && (
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                background: 'rgba(0,0,0,0.6)', color: 'white',
                                                fontSize: '0.6rem', textAlign: 'center', padding: '2px 0'
                                            }}>
                                                관장
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.memberName}>{player.name}</div>
                                    <div className={styles.memberMeta}>{player.weight_class}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </main>
    );
}

// Helper Components & Functions

function FormationNode({ top, left, label, player }: { top: string, left: string, label: string, player: any }) {
    return (
        <div className={styles.formationNode} style={{ top, left }}>
            {player ? (
                <>
                    <img
                        src={player.avatar_url || player.photo_url || 'https://via.placeholder.com/40'}
                        alt={player.name}
                        className={styles.nodeAvatar}
                    />
                    <div className={styles.nodeName}>{player.name}</div>
                </>
            ) : (
                <div className={styles.nodeEmpty}></div>
            )}
        </div>
    );
}

const findPlayersByPos = (players: any[], posPrefix: string) => {
    return players.filter(p => p.skills?.position && p.skills.position.startsWith(posPrefix));
};

// Simple round-robin or first-come assignment for visualization
function findPlayerByPos(players: any[], posPrefix: string, index: number) {
    const candidates = players.filter(p => {
        // Broad matching: FW matches ST, LW, RW...
        // If posPrefix is generic 'FW', match any forward role
        const pPos = p.skills?.position || '';
        if (posPrefix === 'GK') return pPos === 'GK';
        if (posPrefix === 'DF') return ['DF', 'CB', 'LB', 'RB', 'WB'].some(k => pPos.includes(k));
        if (posPrefix === 'MF') return ['MF', 'CM', 'CDM', 'CAM', 'LM', 'RM'].some(k => pPos.includes(k));
        if (posPrefix === 'FW') return ['FW', 'ST', 'CF', 'LW', 'RW'].some(k => pPos.includes(k));
        return false;
    });

    // Fallback: If not enough specific players, fill with anyone unassigned?
    // For now, just return specific match or nothing.
    return candidates[index] || null;
}
