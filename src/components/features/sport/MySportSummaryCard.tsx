"use client";

import React from 'react';
import styles from './MySportSummaryCard.module.css';
import MyPlayerCard from './MyPlayerCard';
import MyTeamCard from './MyTeamCard';

interface MySportSummaryCardProps {
    sportName: string;
    sportIcon: React.ReactNode;
    playerData: any;
    teamList?: any[]; // Changed from teamData
    userAvatarUrl?: string;
    onRegisterTeam?: () => void;
    onEditProfile?: () => void;
    isManageMode?: boolean;
    hideHeader?: boolean;
}

import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import JoinTeamModal from "./JoinTeamModal";

export default function MySportSummaryCard({
    sportName,
    sportIcon,
    playerData,
    teamList, // Changed from teamData
    userAvatarUrl,
    onRegisterTeam,
    onEditProfile,
    hideHeader = false,
    isManageMode = false
}: MySportSummaryCardProps) {
    const router = useRouter(); // Added hook
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [requestStatus, setRequestStatus] = useState<string | null>(null);
    const supabase = createClient();

    const [captainNames, setCaptainNames] = useState<{ [key: string]: string }>({});

    // ... (existing checkRequests logic) ...
    const checkRequests = async () => {
        if (!playerData?.id) return;

        const { data } = await supabase
            .from('team_requests')
            .select('status')
            .eq('player_id', playerData.id)
            .eq('status', 'pending')
            .limit(1)
            .single<{ status: string }>();

        if (data) {
            setRequestStatus(data.status);
        } else {
            setRequestStatus(null);
        }
    };

    useEffect(() => {
        const fetchCaptainNames = async () => {
            if (!teamList || teamList.length === 0) return;

            const missingCaptainIds: string[] = [];
            const newCaptainNames: { [key: string]: string } = {};

            teamList.forEach((team: any) => {
                if (team.captain_id === playerData?.id) {
                    newCaptainNames[team.id] = playerData.name;
                } else {
                    missingCaptainIds.push(team.captain_id);
                }
            });

            if (missingCaptainIds.length > 0) {
                const { data: captains } = await supabase
                    .from('players')
                    .select('id, name')
                    .in('id', missingCaptainIds)
                    .returns<{ id: string, name: string }[]>();

                if (captains) {
                    teamList.forEach((team: any) => {
                        const cap = captains.find((c: any) => c.id === team.captain_id);
                        if (cap) {
                            newCaptainNames[team.id] = cap.name;
                        } else if (team.captain_id === playerData?.id) {
                            newCaptainNames[team.id] = playerData.name;
                        }
                    });
                }
            }

            setCaptainNames(newCaptainNames);
        };
        fetchCaptainNames();
        checkRequests();
    }, [playerData, teamList]);

    // Leave/Disband Modal State
    const [leaveModal, setLeaveModal] = useState({
        isOpen: false,
        teamId: '',
        teamName: '',
        isCaptain: false
    });

    // 1. Open Modal Logic
    const handleLeaveTeam = (teamId: string, teamName: string) => {
        // Find if I am the captain of this team
        const targetTeam = teamList?.find((t: any) => t.id === teamId);
        const isCaptain = targetTeam?.captain_id === playerData?.id;

        setLeaveModal({
            isOpen: true,
            teamId,
            teamName,
            isCaptain
        });
    };

    // 2. Execute Logic (Called by Modal)
    const executeLeaveTeam = async () => {
        try {
            const { teamId, isCaptain } = leaveModal;

            // Derive target sport code for RPC (if captain)
            const targetCode = SPORT_MAPPING[sportName] || playerData.sport_type || 'soccer';

            if (isCaptain) {
                // [Captain Logic] Standard team deletion (DB Triggers handle the rest)
                const { error } = await supabase
                    .from('teams')
                    .delete()
                    .eq('id', teamId);

                if (error) throw error;
                alert("팀이 해체되었습니다.");
            } else {
                // [Member Logic] Standard Leave
                // 1. Delete from team_members
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: memberError } = await (supabase.from('team_members') as any)
                    .delete()
                    .eq('team_id', teamId)
                    .eq('player_id', playerData.id);

                if (memberError) throw memberError;

                // 2. Clear team_id in players table (Legacy support)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: playerError } = await (supabase.from('players') as any)
                    .update({ team_id: null })
                    .eq('id', playerData.id)
                    .eq('team_id', teamId);

                if (playerError) {
                    console.warn("Legacy team_id update failed:", playerError);
                }

                alert("탈퇴 처리되었습니다.");
            }

            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert("처리 중 오류 발생: " + e.message);
        } finally {
            setLeaveModal({ ...leaveModal, isOpen: false });
        }
    };

    // Mapping for consistent sport codes (Korean -> English keys)
    const SPORT_MAPPING: { [key: string]: string } = {
        '축구/풋살': 'soccer',
        '축구': 'soccer',
        '풋살': 'soccer',
        '야구': 'baseball',
        '농구': 'basketball',
        '복싱': 'boxing',
        '헬스': 'health',
        '크로스핏': 'health',
        '격투기': 'boxing',
        '배드민턴/테니스': 'racket',
        '배드민턴': 'racket',
        '테니스': 'racket',
        '킥복싱/MMA': 'kickboxing',
        '킥복싱': 'kickboxing',
        'MMA': 'kickboxing',
        '유도/주짓수': 'judo',
        '유도': 'judo',
        '주짓수': 'judo'
    };

    const handleDeleteProfile = async () => {
        // Derive target sport code from sportName (Korean) or fallback to playerData
        const targetCode = SPORT_MAPPING[sportName] || playerData.sport_type || 'soccer';

        // 1. Check Captaincy
        // If I am captain of ANY team in this sport, I must delete that team FIRST.
        // But the requirement says "if captain, confirm team deletion".
        // We know which teams are managed by this player from `teamList`.
        const captainTeams = teamList?.filter((t: any) => t.captain_id === playerData.id) || [];

        if (captainTeams.length > 0) {
            // Iterate and attempt delete (RPC handles atomicity)
            for (const team of captainTeams) {
                if (window.confirm(`해당 프로필은 [${team.team_name}] 의 캡틴 계정입니다.\n이 프로필을 삭제하면 해당 팀 또한 영구적으로 해체(삭제)됩니다.\n정말 삭제하시겠습니까?`)) {
                    try {
                        // DB에 등록된 만능 삭제 함수 호출 (security definer로 권한 문제 우회)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const { error } = await supabase.rpc('delete_team_and_captain', {
                            target_team_id: team.id,
                            target_player_id: playerData.id,
                            target_sport_code: targetCode // Use mapped code
                        } as any);

                        if (error) throw error;

                        alert("프로필과 팀이 모두 삭제되었습니다.");
                        window.location.reload();
                        return; // Exit after successful deletion (player is gone)

                    } catch (error: any) {
                        console.error("삭제 실패:", error);
                        alert("삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n" + error.message);
                    }
                }
            }
        } else {
            // Normal Player
            if (!confirm(`정말 ${sportName} 프로필을 삭제 하시겠습니까?\n해당 프로필을 삭제하면 가입되어 있던 팀에서도 모두 탈퇴 처리됩니다.`)) return;

            try {
                const { error } = await supabase
                    .from('players')
                    .delete()
                    .eq('id', playerData.id);

                if (error) throw error;

                alert("프로필이 삭제되었습니다.");
                window.location.reload();
            } catch (e: any) {
                console.error(e);
                alert("삭제 중 오류 발생: " + e.message);
            }
        }
    };


    // Normalized Column Rendering via Tags (Badges)
    const sportType = playerData.sport_type?.toLowerCase() || '';
    const tags: string[] = [];

    // Boxing / Combat
    if (['boxing', 'kickboxing', 'judo', 'mma'].includes(sportType)) {
        if (playerData.weight_class) tags.push(`${playerData.weight_class}kg`);
        if (playerData.position) tags.push(playerData.position);
        if (playerData.record) tags.push(playerData.record);
    }
    // Soccer
    else if (['soccer', 'futsal'].includes(sportType)) {
        if (playerData.position) tags.push(playerData.position);
        if (playerData.main_foot) tags.push(`주발: ${playerData.main_foot}`);
        if (playerData.skill_level) {
            const levelMap: { [key: string]: string } = { 'High': '실력: 상', 'Mid': '실력: 중', 'Low': '실력: 하' };
            tags.push(levelMap[playerData.skill_level] || playerData.skill_level);
        }
    }
    // Baseball
    else if (sportType === 'baseball') {
        if (playerData.position) tags.push(playerData.position);
        if (playerData.main_foot) tags.push(playerData.main_foot);
    }
    // Health (Fallback)
    else if (['health', 'fitness', 'gym'].includes(sportType)) {
        if (playerData.weight_class) tags.push(playerData.weight_class);
    }
    // Fallback
    else {
        if (playerData.position) tags.push(playerData.position);
        if (playerData.weight_class) tags.push(playerData.weight_class);
    }

    if (tags.length === 0) tags.push("-");

    const location = playerData.location || "지역 미설정";
    const sportTypeInternal = playerData.sport_type;

    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className={styles.card}>
            {/* Outer Header */}
            {!hideHeader && (
                <div
                    className={styles.header}
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className={styles.sportIcon}>{sportIcon}</div>
                        <div className={styles.sportName}>{sportName}</div>
                    </div>
                    <div className={styles.toggleBtn} style={{ fontSize: '1rem', color: '#9CA3AF', paddingRight: '0.5rem' }}>
                        {isExpanded ? '▲' : '▼'}
                    </div>
                </div>
            )}

            {/* Body with Inner Cards */}
            {isExpanded && (
                <div className={styles.body}>

                    {/* 1. Player Section */}
                    <div className={styles.section}>
                        <span className={styles.sectionTitle} style={{ marginBottom: 0 }}>내 선수 프로필</span>
                        <MyPlayerCard
                            name={playerData.name || "이름 없음"}
                            gymName={location}
                            tags={tags}
                            imageUrl={userAvatarUrl}
                            onViewProfile={isManageMode ? undefined : () => router.push(`/player/${playerData.id}`)} // Hide link in manage mode
                            hasTeam={teamList && teamList.length > 0}
                            requestStatus={requestStatus}
                            onFindTeam={() => setIsJoinModalOpen(true)}
                            isManageMode={isManageMode}
                            onDelete={handleDeleteProfile}
                        />
                    </div>

                    {/* 2. Team Section */}
                    <div className={styles.section}>
                        <span className={styles.sectionTitle}>
                            {sportName.includes('복싱') || sportName.includes('BOXING') || sportName.includes('주짓수') || sportName.includes('유도') || sportName.includes('MMA') || sportName.includes('킥복싱') ? "내 체육관 / 소속" : "나의 팀 / 소속"}
                        </span>

                        {/* Render List of Teams */}
                        {teamList && teamList.length > 0 && teamList.map((team: any) => (
                            <div key={team.id} style={{ marginBottom: '1rem', position: 'relative' }}>
                                <MyTeamCard
                                    teamId={team.id}
                                    teamName={team.team_name}
                                    captainName={captainNames[team.id] || "로딩 중..."}
                                    description={team.description}
                                    isRegistered={true}
                                    emblemUrl={team.emblem_url}
                                    title={sportName.includes('복싱') || sportName.includes('BOXING') || sportName.includes('주짓수') || sportName.includes('유도') || sportName.includes('MMA') || sportName.includes('킥복싱') ? "내 체육관" : "나의 팀"}
                                    sportType={playerData.sport_type}
                                    rating={5.0} // Mock
                                    history={['WIN', 'DRAW', 'WIN', 'LOSS', 'WIN']} // Mock
                                    isCaptain={team.captain_id === playerData.id}
                                    representativePlayers={team.representative_players}
                                    isManageMode={isManageMode}
                                    onLeave={() => handleLeaveTeam(team.id, team.team_name)}
                                />
                            </div>
                        ))}

                        {/* Always Show Add Team Button (Multi-Team Support) */}
                        {!isManageMode && (
                            <>
                                <button
                                    onClick={() => router.push(`/team/new?sport=${sportName}`)}
                                    className={styles.addTeamButton}
                                >
                                    <div className={styles.plusIcon}>+</div>
                                    <div className={styles.buttonText}>{(teamList && teamList.length > 0) ? '다른 팀 추가 창단하기' : '새로운 팀 창단하기'}</div>
                                </button>

                                <button
                                    onClick={() => setIsJoinModalOpen(true)}
                                    className={styles.addTeamButton}
                                    style={{ marginTop: '0.5rem', borderStyle: 'dashed', borderColor: '#ccc', background: 'transparent' }}
                                >
                                    <div className={styles.plusIcon}>🔍</div>
                                    <div className={styles.buttonText}>새 팀 가입하기</div>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Join Team Modal */}
            <JoinTeamModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                sportType={sportTypeInternal}
                playerId={playerData.id}
                onJoinRequestSent={checkRequests}
            />

            {/* Leave/Disband Confirmation Modal */}
            {leaveModal.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '400px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1F2937' }}>
                            {leaveModal.isCaptain ? '🚨 팀 해체 경고' : '⚠️ 팀 탈퇴 확인'}
                        </h2>

                        <p style={{ marginBottom: '1.5rem', whiteSpace: 'pre-line', color: '#4B5563', lineHeight: '1.5' }}>
                            {leaveModal.isCaptain
                                ? `${playerData.name}님은 [${leaveModal.teamName}]의 캡틴입니다.\n\n캡틴이 팀을 탈퇴하면 해당 팀은 즉시 해체(삭제)됩니다.\n정말 팀을 해체하시겠습니까?`
                                : `정말 [${leaveModal.teamName}]에서 탈퇴하시겠습니까?\n다시 가입하려면 캡틴의 승인이 필요합니다.`}
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setLeaveModal({ ...leaveModal, isOpen: false })}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB',
                                    backgroundColor: 'white', color: '#374151', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={executeLeaveTeam}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '0.5rem', border: 'none',
                                    backgroundColor: leaveModal.isCaptain ? '#DC2626' : '#2563EB', // Red for Captain, Blue for Member
                                    color: 'white', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                {leaveModal.isCaptain ? '팀 해체하기' : '탈퇴하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
