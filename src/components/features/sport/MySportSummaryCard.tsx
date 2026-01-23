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

    // Delete / Leave Logic
    const handleLeaveTeam = async (teamId: string, teamName: string) => {
        if (!confirm(`정말 ${teamName} 에서 탈퇴하시겠습니까?\n다시 가입하시려면 캡틴의 승인을 받아야 합니다.`)) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('team_members') as any)
                .delete()
                .eq('team_id', teamId)
                .eq('player_id', playerData.id);

            if (error) throw error;

            alert("탈퇴 처리되었습니다.");
            window.location.reload(); // Simple refresh
        } catch (e: any) {
            console.error(e);
            alert("탈퇴 중 오류 발생: " + e.message);
        }
    };

    const handleDeleteProfile = async () => {
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
                        const { error } = await supabase.rpc('delete_team_and_captain', {
                            target_team_id: team.id,
                            target_player_id: playerData.id
                        });

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


    // Parse Player Skills for Display
    const skills = playerData?.skills || {};
    const tags: string[] = [];

    // ... (existing tag logic) ...
    // Sport-Specific Tag Generation
    if (sportName.includes('축구') || sportName.includes('SOCCER') || sportName.includes('풋살')) {
        if (skills.position) tags.push(skills.position);
        if (skills.foot) {
            const footMap: { [key: string]: string } = { 'Right': '오른발', 'Left': '왼발', 'Both': '양발' };
            tags.push(footMap[skills.foot] || skills.foot);
        }
        if (skills.level) {
            const levelMap: { [key: string]: string } = { 'High': '실력: 상', 'Mid': '실력: 중', 'Low': '실력: 하' };
            tags.push(levelMap[skills.level] || skills.level);
        }
    } else {
        if (skills.weightClass) tags.push(skills.weightClass);
        if (skills.totalWeight) tags.push(`3대 ${skills.totalWeight}kg`);
        if (skills.years) tags.push(`구력 ${skills.years}년`);
        if (skills.style) tags.push(skills.style);
        if (skills.stance) tags.push(skills.stance);
        if (skills.level && tags.length < 3) {
            const levelMap: { [key: string]: string } = { 'High': '실력: 상', 'Mid': '실력: 중', 'Low': '실력: 하' };
            tags.push(levelMap[skills.level] || skills.level);
        }
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
                            onEdit={isManageMode ? undefined : onEditProfile} // Hide edit in manage mode
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
        </div>
    );
}
