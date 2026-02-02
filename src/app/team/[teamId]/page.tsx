"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import styles from "./team.module.css";
import NaverMapViewer from "@/components/common/NaverMapViewer";

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
    const [repPlayers, setRepPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            // 1. Fetch Team Details with Captain Info (Join)
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('*, captain:players!captain_id(*)') // Joined captain data
                .eq('id', teamId)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .single<any>();

            if (teamError) {
                // Ignore "Row not found" error (PGRST116) as we handle !team below
                if (teamError.code !== 'PGRST116') {
                    console.error("Team fetch error:", teamError.message);
                }
                setLoading(false);
                return;
            }

            // 2. Fetch Members (via team_members)
            const { data: membersData, error: membersError } = await supabase
                .from('team_members')
                .select('*, players(*)')
                .eq('team_id', teamId);

            if (membersError) console.error(membersError);

            // Map team_members to players list
            const playersData = membersData?.map((m: any) => m.players).filter(p => p) || [];

            // 3. Merge Captain into Players List (if not already present via members)
            let allPlayers = playersData || [];
            if (teamData.captain) {
                const exists = allPlayers.find(p => p.id === teamData.captain.id);
                if (!exists) {
                    allPlayers = [teamData.captain, ...allPlayers];
                }
            }

            // 4. [Optimization] Link Representative Players (Filter from allPlayers without DB refetch)
            let rawRepPlayers = teamData.representative_players;
            let targetIds: string[] = [];

            // JSON Parsing (Defensive Logic)
            if (Array.isArray(rawRepPlayers)) {
                targetIds = rawRepPlayers;
            } else if (typeof rawRepPlayers === 'string') {
                try {
                    targetIds = JSON.parse(rawRepPlayers);
                } catch (e) {
                    console.error("Failed to parse rep players:", e);
                    targetIds = [];
                }
            }

            // Filter from already loaded allPlayers instead of new DB fetch
            const matchedRepPlayers = allPlayers.filter(p => targetIds.includes(p.id));

            // Ensure teamData format is array for UI rendering
            teamData.representative_players = targetIds;

            setRepPlayers(matchedRepPlayers);
            setTeam(teamData);
            setPlayers(allPlayers);
            setLoading(false);
        };

        fetchData();
    }, [teamId]);

    if (loading) return <div className={styles.container}>로딩 중...</div>;
    if (!team) return <div className={styles.container}>팀 정보를 찾을 수 없습니다.</div>;

    // Correct Ownership Check: User ID (Auth) vs Captain's User ID (DB)
    const isCaptain = currentUserId && team.captain && currentUserId === team.captain.user_id;

    // Determine Type
    const isTeamSport = ['soccer', 'foot', 'futsal', 'base', 'basket', 'volley', 'jokgu'].some(k => team.sport_type?.toLowerCase().includes(k));
    const isCombatSport = ['boxing', 'kickboxing', 'judo', 'mma'].some(k => team.sport_type?.toLowerCase().includes(k));

    // Parse JSONB fields (defensively)
    const matchHistory = Array.isArray(team.match_history) ? team.match_history : [];

    // Placeholder data for demo if empty
    const displayMatchHistory = matchHistory.length > 0 ? matchHistory : [
        { date: '2026-01-24', opponent: '상대팀', score: '3 : 1', result: 'WIN' },
        { date: '2026-01-21', opponent: '상대팀', score: '2 : 4', result: 'LOSS' }
    ];

    // Coach Logic: Use Captain if no explicit coach info
    // 1. Find Captain Data from players list matches team.captain
    const captainData = team.captain;

    // 2. Determine displayCoaches
    let displayCoaches = (team.coaches_info && team.coaches_info.length > 0)
        ? team.coaches_info.map((c: any) => {
            // Re-map to display object, ensuring fallbacks
            const matchedPlayer = c.user_id ? players.find(p => p.user_id === c.user_id) : null;
            return {
                name: matchedPlayer?.name || c.name || '정보 없음',
                // Priority: Explicit Role -> Player Position -> Default '코치'
                style: c.role || matchedPlayer?.skills?.position || '코치',
                career: c.career || '등록된 소개가 없습니다.',
                photoUrl: matchedPlayer?.avatar_url || matchedPlayer?.photo_url || c.photoUrl || null
            };
        })
        : [{
            name: captainData?.name || '정보 없음',
            style: '메인 관장', // Default for captain fallback
            career: team.description || '베테랑 지도자',
            photoUrl: captainData?.avatar_url || captainData?.photo_url || null
        }];

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
                                    {team.captain?.name || '정보 없음'}
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
                <h3 className={styles.subTitle}>{isTeamSport ? '팀 소개' : '체육관 소개'}</h3>
                <div className={styles.descriptionBox}>
                    {team.introduction ? team.introduction : (
                        <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                            {isCaptain ? (isTeamSport ? "팀 소개글을 작성해주세요." : "체육관 소개글을 작성해주세요.") : (isTeamSport ? "아직 팀 소개글이 없습니다." : "아직 체육관 소개글이 없습니다.")}
                        </span>
                    )}
                </div>
            </section>

            {/* Location Section (Universal) */}
            {team.location && (
                <section className={styles.section}>
                    <h3 className={styles.subTitle}>{isTeamSport ? '홈 구장' : '체육관 위치'}</h3>
                    <NaverMapViewer address={team.location} />
                </section>
            )}



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
                        <h2 className={styles.sectionTitle}>코치진(지도자) 소개</h2>
                        {displayCoaches.map((coach: any, idx: number) => (
                            <div key={idx} className={styles.boxingCoachCard}>
                                <div style={{ flexShrink: 0 }}>
                                    {coach.photoUrl ? (
                                        <img src={coach.photoUrl} alt={coach.name} className={styles.coachPhoto} />
                                    ) : (
                                        <div className={styles.coachPhoto} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: '#F3F4F6', color: '#9CA3AF', fontWeight: 'bold' }}>
                                            {coach.name ? coach.name[0] : '🥊'}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.coachInfo}>
                                    <div className={styles.coachHeader}>
                                        <span className={styles.coachName}>{coach.name}</span>
                                        <span className={styles.coachBadge}>{coach.style || '코치'}</span>
                                    </div>
                                    <div className={styles.coachCareer}>{coach.career}</div>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Location Section */}


                    {/* Representative Players Section */}
                    {team.representative_players && Array.isArray(team.representative_players) && team.representative_players.some((id: string) => id) && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>대표 선수</h2>
                            <div className={styles.repGrid}>
                                {[0, 1, 2, 3].map(idx => {
                                    const playerId = team.representative_players[idx];
                                    const player = playerId ? repPlayers.find(p => p.id === playerId) : null;

                                    return (
                                        <div key={idx} className={styles.repCard} style={{ cursor: 'default' }}>
                                            {/* Cursor default since detail page isn't interactive */}
                                            {player ? (
                                                <>
                                                    <img
                                                        src={player.avatar_url || player.photo_url || 'https://via.placeholder.com/60'}
                                                        alt={player.name}
                                                        className={styles.repAvatar}
                                                    />
                                                    <div className={styles.repName}>{player.name}</div>
                                                    <div className={styles.repInfo}>
                                                        <span>
                                                            {(player.skills?.weightClass || player.weight_class)
                                                                ? `${player.skills?.weightClass || player.weight_class}${isCombatSport ? 'kg' : ''}`
                                                                : '-'}
                                                        </span>
                                                        <span>{player.stance || player.position || player.style || player.skills?.stance || player.skills?.style || player.skills?.position || '-'}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={styles.repEmpty}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '50%', height: '50%', color: '#D1D5DB' }}>
                                                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

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
                                    <div className={styles.memberMeta}>
                                        {player.weight_class ? `${player.weight_class}${isCombatSport ? 'kg' : ''}` : ''}
                                    </div>
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
