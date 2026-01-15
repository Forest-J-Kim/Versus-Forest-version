"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./sport.module.css";
import { SPORTS, Sport } from "@/app/page";
import MyTeamCard from "@/components/features/sport/MyTeamCard";
import CaptainActions from "@/components/features/sport/CaptainActions";
import MyPlayerCard from "@/components/features/sport/MyPlayerCard";
import MyGymCard from "@/components/features/sport/MyGymCard";
import TeamPlayerCard from "@/components/features/sport/TeamPlayerCard";
import EmptyProfileCard from "@/components/features/sport/EmptyProfileCard";
import { createClient } from "@/utils/supabase/client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function SportDashboard({ params }: PageProps) {
    const router = useRouter();
    const resolvedParams = use(params);
    const sportId = resolvedParams.id;
    const sport = SPORTS.find(s => s.id === sportId);

    // State
    const [loading, setLoading] = useState(true);
    const [isManagerMode, setIsManagerMode] = useState(false);
    const [playerProfile, setPlayerProfile] = useState<any>(null);
    const [hasRole, setHasRole] = useState(false); // Can be captain?

    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // 1. Check Roles for Captain Status (for this sport)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('roles')
                    .eq('id', user.id)
                    .single();

                if (profile?.roles && profile.roles[sportId.toLowerCase()] === 'captain') {
                    setHasRole(true);
                    setIsManagerMode(true); // Default to manager mode if captain
                }

                // 2. Mock Fetch from 'players' table as requested
                // (We assume this table exists or will exist. If not, it returns error or empty)
                const { data: playerData, error } = await supabase
                    .from('players')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('sport_type', sportId)
                    .single();

                if (playerData) {
                    setPlayerProfile(playerData);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [sportId]);


    if (!sport) {
        return <div className={styles.container}>Sport not found</div>;
    }

    const isTeamSport = sport.type === 'TEAM' || sport.type === 'RACKET';
    const isCombatSport = sport.type === 'COMBAT';
    const isHealthSport = sportId === 'HEALTH';

    return (
        <main className={styles.container}>
            {/* 1. Header with Sport Name */}
            <header className={styles.header}>
                <div className={styles.headerIcon} style={{ background: sport.color }}>
                    {sport.icon}
                </div>
                <h1 className={styles.headerTitle}>{sport.name}</h1>

                {/* Mode Toggle: Show only if user IS a captain/manager for this sport */}
                {!isHealthSport && hasRole && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                            {isTeamSport ? '주장 모드' : '관장 모드'}
                        </span>
                        <label className={styles.toggleLabel}>
                            <input
                                type="checkbox"
                                className={styles.toggleInput}
                                checked={isManagerMode}
                                onChange={(e) => setIsManagerMode(e.target.checked)}
                            />
                            <span className={styles.toggleSlider}></span>
                        </label>
                    </div>
                )}
            </header>

            {/* 2. My Info / Team Section */}
            <section>
                {/* 
                    Logic:
                    1. If Loading -> Skeleton (omitted for brevity, just null)
                    2. If No Player Profile -> EmptyProfileCard
                    3. If Player Profile -> Show Cards
                */}

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>정보 불러오는 중...</div>
                ) : !playerProfile ? (
                    <EmptyProfileCard sportName={sport.name} onClick={() => alert('프로필 등록 화면으로 이동 (준비중)')} />
                ) : (
                    <>
                        {/* Render Real Data Logic Here */}
                        {/* Note: Since we are fetching from a unified 'players' table example, 
                            we map fields dynamically. Assuming generic fields for now to avoid TS errors 
                            or extensive interface definitions. 
                        */}

                        {/* Case A: Boxing/Combat */}
                        {isCombatSport && (
                            <>
                                <MyPlayerCard
                                    name={playerProfile.name || "이름 없음"}
                                    gymName={playerProfile.gym_name || "소속 없음"}
                                    style={playerProfile.style || "-"}
                                    level={playerProfile.level || "초심자"}
                                />
                                {/* Optional: Only show Gym Card if manager or if gym info exists */}
                                {playerProfile.gym_name && (
                                    <MyGymCard
                                        gymName={playerProfile.gym_name}
                                        location={playerProfile.location || "위치 미등록"}
                                        proCount={playerProfile.pro_count || 0}
                                        amateurCount={playerProfile.amateur_count || 0}
                                    />
                                )}
                            </>
                        )}

                        {/* Case B: Soccer/Team */}
                        {isTeamSport && (
                            <>
                                <TeamPlayerCard
                                    name={playerProfile.name}
                                    position={playerProfile.position}
                                />
                                {playerProfile.team_name && (
                                    <MyTeamCard
                                        teamName={playerProfile.team_name}
                                        captainName={playerProfile.captain_name || playerProfile.name} // fallback
                                        rating={playerProfile.rating || 0}
                                        history={playerProfile.history || []}
                                    />
                                )}
                            </>
                        )}

                        {/* Case C: Health */}
                        {isHealthSport && (
                            <MyPlayerCard
                                name={playerProfile.name}
                                gymName={playerProfile.gym_name || "홈트"}
                                style={playerProfile.style || "일반"}
                                level={playerProfile.level || "헬린이"}
                            />
                        )}
                    </>
                )}
            </section>

            {/* 3. Captain/Manager Actions (Only visible in Manager/Captain Mode) */}
            {isManagerMode && !isHealthSport && (
                <section className={styles.captainSection}>
                    <CaptainActions />
                </section>
            )}

            {/* 4. Main Matches/Guest Actions */}
            <section className={styles.actionSection}>
                <div
                    className={styles.actionCard}
                    onClick={() => router.push(`/matches?sport=${sport.id}&mode=${sport.type === 'COMBAT' ? 'SOLO' : 'TEAM'}`)}
                >
                    <div className={styles.actionIcon} style={{ color: '#2563EB', background: '#EFF6FF' }}>
                        {isHealthSport ? '🏋️' : (sport.type === 'COMBAT' ? '🥊' : '🏆')}
                    </div>
                    <div className={styles.actionInfo}>
                        <h3 className={styles.actionTitle}>
                            {isHealthSport ? '운동 파트너 찾기' :
                                (isCombatSport
                                    ? (isManagerMode ? '경기 상대 찾기' : '스파링 상대 찾기')
                                    : '팀 매치 찾기')
                            }
                        </h3>
                        <p className={styles.actionDesc}>
                            {isHealthSport ? '서로 동기부여 할 파트너' :
                                (isCombatSport
                                    ? (isManagerMode ? '소속 선수 매칭' : '개인 실력 겨루기')
                                    : '우리 팀의 실력 증명')
                            }
                        </p>
                    </div>
                </div>

                {!isCombatSport && !isHealthSport && (
                    <div
                        className={styles.actionCard}
                        onClick={() => router.push(`/select-sport?sport=${sport.id}&mode=GUEST`)}
                    >
                        <div className={styles.actionIcon} style={{ color: '#059669', background: '#ECFDF5' }}>
                            👟
                        </div>
                        <div className={styles.actionInfo}>
                            <h3 className={styles.actionTitle}>용병 구인 / 지원</h3>
                            <p className={styles.actionDesc}>팀원이 부족할 때</p>
                        </div>
                    </div>
                )}
            </section>

            {/* 5. Community Section - (Keeping mock posts for community as requested to clear USER DATA, but usually community has content) */}
            {/* User said "Remove dummy data... and show Empty State if DB data is missing".
                Does this apply to Community posts? Usually yes.
                I will clear the hardcoded posts and just show "게시글이 없습니다" or keep it minimal.
                User said "썰렁할 정도로 깨끗해야 한다". So I will remove hardcoded posts too.
            */}
            <section className={styles.communitySection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{isHealthSport ? '헬스 톡(Talk)' : `${sport.name} 톡(Talk)`}</h2>
                    <span className={styles.moreLink} onClick={() => alert('준비중')}>더보기</span>
                </div>
                <div className={styles.postList}>
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
                        아직 게시글이 없습니다.
                    </div>
                </div>
            </section>
        </main>
    );
}
