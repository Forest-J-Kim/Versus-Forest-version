"use client";


import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import styles from "./player.module.css";
import MyTeamCard from "@/components/features/sport/MyTeamCard";

interface PageProps {
    params: Promise<{ id: string }>;
}

const SPORT_NAMES: { [key: string]: string } = {
    soccer: '⚽ 축구/풋살',
    boxing: '🥊 복싱',
    basketball: '🏀 농구',
    baseball: '⚾ 야구',
    racket: '🏸 배드민턴/테니스',
    kickboxing: '🦵 킥복싱/MMA',
    judo: '🥋 유도/주짓수',
    health: '🏋️ 헬스',
};

export default function PlayerProfilePage({ params }: PageProps) {
    const router = useRouter();
    const resolvedParams = use(params);
    const playerId = resolvedParams.id;
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [player, setPlayer] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayer = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            const { data, error } = await supabase
                .from('players')
                .select('*')
                .eq('id', playerId)
                .single();

            if (error) {
                console.error("Player fetch error:", error);
            } else {
                setPlayer(data);
                if (data.team_id) {
                    const { data: teamData } = await supabase
                        .from('teams')
                        .select('*, captain:players!captain_id(name)')
                        .eq('id', data.team_id)
                        .single();
                    if (teamData) setTeam(teamData);
                }
            }
            setLoading(false);
        };
        fetchPlayer();
    }, [playerId, supabase]);

    if (loading) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩 중...</div>;
    if (!player) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>프로필 정보를 찾을 수 없습니다.</div>;

    const isMyProfile = currentUserId === player.user_id;
    const sportCode = (player.sport_type || '').toLowerCase();
    const sportName = SPORT_NAMES[sportCode] || player.sport_type || '종목 미상';

    let recordDisplay = "전적 없음";
    if (player.wins > 0 || player.draws > 0 || player.losses > 0) {
        const w = player.wins || 0;
        const d = player.draws || 0;
        const l = player.losses || 0;
        const total = w + d + l;
        recordDisplay = `${total}전 ${w}승 ${d > 0 ? d + '무 ' : ''}${l}패`;
    } else if (player.record) {
        recordDisplay = player.record;
    }

    const tags: string[] = [];
    if (player.skill_level) tags.push(`실력: ${player.skill_level}`);
    if (player.main_foot) tags.push(`주발: ${player.main_foot}`);
    if (!['boxing', 'kickboxing', 'judo', 'health'].includes(sportCode) && player.position) tags.push(player.position);

    if (player.skills) {
        try {
            const parsedSkills = typeof player.skills === 'string' ? JSON.parse(player.skills) : player.skills;
            if (Array.isArray(parsedSkills)) {
                parsedSkills.forEach((s: any) => tags.push(String(s)));
            }
        } catch (e) {
            console.error(e);
        }
    }

    const matchHistory = [
        { date: '2026-02-15', opponent: '상대 선수', score: '3R 판정승', result: 'WIN' },
        { date: '2026-01-20', opponent: '스파링 파트너', score: 'TKO 승', result: 'WIN' }
    ];

    let parsedCareers: any[] = [];
    if (player.career_history) {
        try {
            parsedCareers = typeof player.career_history === 'string' ? JSON.parse(player.career_history) : player.career_history;
            if (!Array.isArray(parsedCareers)) parsedCareers = [];
        } catch (e) {
            console.error("Failed to parse career_history JSON", e);
        }
    }

    const typeToIcon = (type: string) => {
        switch (type) {
            case 'award': return '🏅';
            case 'edu': return '🎓';
            case 'job': return '💼';
            default: return '📌';
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.topHeader}>
                <h2 className={styles.pageTitle}>개인 프로필</h2>
                {isMyProfile && (
                    <button
                        className={styles.editButton}
                        onClick={() => router.push(`/profile/edit/${sportCode}`)}
                    >
                        수정
                    </button>
                )}
            </div>

            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.emblem}>
                        {player.avatar_url ? (
                            <img src={player.avatar_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : '👤'}
                    </div>

                    <div className={styles.teamInfo}>
                        <h1 className={styles.teamName}>{player.name}</h1>
                        <div className={styles.metaInfo} style={{ marginBottom: '0.5rem' }}>
                            {['soccer', 'futsal'].includes(sportCode) ? (
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>⚽ {player.position || '포지션 미입력'}</span>
                                    <span className={styles.metaValue} style={{ fontWeight: 'bold', color: '#3B82F6', marginLeft: '4px' }}>
                                        | 👟 {player.main_foot === 'Both' ? '양발' : player.main_foot === 'Right' ? '오른발' : player.main_foot === 'Left' ? '왼발' : '주발 미입력'}
                                    </span>
                                </div>
                            ) : (
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>전적:</span>
                                    <span className={styles.metaValue} style={{ fontWeight: 'bold', color: '#EF4444' }}>
                                        🥊 {recordDisplay}
                                    </span>
                                </div>
                            )}
                        </div>
                        {player.short_intro && (
                            <p className={styles.teamDesc} style={{ fontSize: '1rem', color: '#111827', fontWeight: 600, marginTop: '0.5rem' }}>
                                {player.short_intro}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            <section className={styles.section}>
                <h3 className={styles.subTitle}>개인 스펙</h3>
                <div className={styles.specList}>
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>출생</span>
                        <span className={styles.specRowValue}>{player.birth_year ? `${player.birth_year}년생` : '-'}</span>
                    </div>
                    {!['soccer', 'futsal'].includes(sportCode) && (
                        <div className={styles.specRow}>
                            <span className={styles.specRowLabel}>체급</span>
                            <span className={styles.specRowValue}>{player.weight_class ? `${player.weight_class} kg` : '-'}</span>
                        </div>
                    )}
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>신장</span>
                        <span className={styles.specRowValue}>{player.height ? `${player.height} cm` : '-'}</span>
                    </div>
                    {!['soccer', 'futsal'].includes(sportCode) && (
                        <div className={styles.specRow}>
                            <span className={styles.specRowLabel}>리치</span>
                            <span className={styles.specRowValue}>{player.reach ? `${player.reach} cm` : '-'}</span>
                        </div>
                    )}
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>{['soccer', 'futsal'].includes(sportCode) ? '포지션' : '스탠스'}</span>
                        <span className={styles.specRowValue}>{player.position || player.stance || '-'}</span>
                    </div>
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>주 활동지</span>
                        <span className={styles.specRowValue}>{player.location || '-'}</span>
                    </div>
                </div>
            </section>

            {team && (
                <section className={styles.section}>
                    <h3 className={styles.subTitle}>{['soccer', 'futsal'].includes(sportCode) ? '소속 팀' : '소속 체육관'}</h3>
                    <div style={{ marginTop: '0.5rem' }}>
                        <MyTeamCard
                            teamId={team.id}
                            teamName={team.team_name}
                            captainName={team.captain?.name || "알 수 없음"}
                            description={team.description}
                            emblemUrl={team.emblem_url}
                            sportType={team.sport_type}
                            isRegistered={true}
                            isManageMode={false}
                            title="소속 팀"
                            rating={team.rating || 5}
                            history={[]}
                        />
                    </div>
                </section>
            )}

            <section className={styles.section}>
                <h3 className={styles.subTitle}>경력 사항</h3>
                <div className={styles.descriptionBox}>
                    {parsedCareers.length > 0 ? (
                        parsedCareers.map((c: any, i: number) => (
                            <div key={i} className={styles.careerRow}>
                                <div className={styles.careerIcon}>{typeToIcon(c.type)}</div>
                                <div className={styles.careerName}>{c.name}</div>
                                <div className={styles.careerYear}>{c.year || ''}</div>
                            </div>
                        ))
                    ) : (
                        <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                            {isMyProfile ? "경력 사항을 추가해 나를 어필해보세요." : "등록된 경력 사항이 없습니다."}
                        </span>
                    )}
                </div>
            </section>

            <section className={styles.section}>
                <h3 className={styles.subTitle}>상세 소개</h3>
                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #E5E7EB', whiteSpace: 'pre-wrap', color: '#374151', lineHeight: '1.6' }}>
                    {player.description ? player.description : (
                        <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                            {isMyProfile ? "상세한 소개를 작성해 보세요!" : "상세 소개가 없습니다."}
                        </span>
                    )}
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>최근 매치 히스토리</h2>
                <div className={styles.matchList}>
                    {matchHistory.map((match: any, idx: number) => (
                        <div key={idx} className={styles.matchCard}>
                            <div>
                                <div className={styles.matchDate}>{match.date}</div>
                                <div style={{ fontWeight: 'bold' }}>VS {match.opponent}</div>
                            </div>
                            <div className={styles.matchContent}>
                                <div className={styles.score} style={{ fontSize: '0.9rem', color: '#6B7280', marginRight: '8px' }}>{match.score}</div>
                                <div className={`${styles.resultBadge} ${match.result === 'WIN' ? styles.win : match.result === 'LOSS' ? styles.loss : styles.draw}`}>
                                    {match.result === 'WIN' ? '승' : match.result === 'LOSS' ? '패' : '무'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
