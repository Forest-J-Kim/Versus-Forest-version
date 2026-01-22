"use client";

import React from 'react';
import styles from './MySportSummaryCard.module.css';
import MyPlayerCard from './MyPlayerCard';
import MyTeamCard from './MyTeamCard';

interface MySportSummaryCardProps {
    sportName: string;
    sportIcon: React.ReactNode;
    playerData: any;
    teamData?: any;
    userAvatarUrl?: string;
    onRegisterTeam?: () => void;
    onEditProfile?: () => void;
    hideHeader?: boolean;
}

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import JoinTeamModal from "./JoinTeamModal";

export default function MySportSummaryCard({
    sportName,
    sportIcon,
    playerData,
    teamData,
    userAvatarUrl,
    onRegisterTeam,
    onEditProfile,
    hideHeader = false
}: MySportSummaryCardProps) {
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [requestStatus, setRequestStatus] = useState<string | null>(null);
    const supabase = createClient();

    // Check for pending requests if no team
    const checkRequests = async () => {
        if (teamData || !playerData?.id) return;

        const { data } = await supabase
            .from('team_requests')
            .select('status')
            .eq('player_id', playerData.id)
            .eq('status', 'pending')
            .limit(1)
            .single();

        if (data) {
            setRequestStatus(data.status);
        } else {
            setRequestStatus(null);
        }
    };

    useEffect(() => {
        checkRequests();
    }, [playerData, teamData]);

    // Parse Player Skills for Display
    const skills = playerData?.skills || {};
    const tags: string[] = [];

    // Sport-Specific Tag Generation
    if (sportName.includes('축구') || sportName.includes('SOCCER') || sportName.includes('풋살')) {
        // 1. Position
        if (skills.position) tags.push(skills.position);

        // 2. Foot
        if (skills.foot) {
            const footMap: { [key: string]: string } = { 'Right': '오른발', 'Left': '왼발', 'Both': '양발' };
            tags.push(footMap[skills.foot] || skills.foot);
        }

        // 3. Level
        if (skills.level) {
            const levelMap: { [key: string]: string } = { 'High': '실력: 상', 'Mid': '실력: 중', 'Low': '실력: 하' };
            tags.push(levelMap[skills.level] || skills.level);
        }
    } else {
        // Fallback or Other Sports
        if (skills.weightClass) tags.push(skills.weightClass);

        // 3대 중량
        if (skills.totalWeight) tags.push(`3대 ${skills.totalWeight}kg`);

        // 구력
        if (skills.years) tags.push(`구력 ${skills.years}년`);

        if (skills.style) tags.push(skills.style);
        if (skills.stance) tags.push(skills.stance);

        if (skills.level && tags.length < 3) {
            const levelMap: { [key: string]: string } = { 'High': '실력: 상', 'Mid': '실력: 중', 'Low': '실력: 하' };
            tags.push(levelMap[skills.level] || skills.level);
        }
    }

    // Fallback if empty
    if (tags.length === 0) tags.push("-");

    const location = playerData.location || "지역 미설정";

    // Calculate sport_type for modal (using from playerData if available or inferring?)
    // Actually we don't have sport_type string easily in props, but sportName is localized.
    // Ideally we should pass sport_type code prop, but playerData has sport_type.
    const sportTypeInternal = playerData.sport_type;

    return (
        <div className={styles.card}>
            {/* Outer Header */}
            {!hideHeader && (
                <div className={styles.header}>
                    <div className={styles.sportIcon}>{sportIcon}</div>
                    <div className={styles.sportName}>{sportName}</div>
                </div>
            )}

            {/* Body with Inner Cards */}
            <div className={styles.body}>

                {/* 1. Player Section */}
                <div className={styles.section}>
                    <span className={styles.sectionTitle}>내 선수 프로필</span>
                    <MyPlayerCard
                        name={playerData.name || "이름 없음"}
                        gymName={location}
                        tags={tags}
                        imageUrl={userAvatarUrl}
                        onEdit={onEditProfile}
                        hasTeam={!!teamData}
                        requestStatus={requestStatus}
                        onFindTeam={() => setIsJoinModalOpen(true)}
                    />
                </div>

                {/* 2. Team Section */}
                <div className={styles.section}>
                    <span className={styles.sectionTitle}>
                        {sportName.includes('복싱') || sportName.includes('BOXING') || sportName.includes('주짓수') || sportName.includes('유도') || sportName.includes('MMA') || sportName.includes('킥복싱') ? "내 체육관 / 소속" : "나의 팀 / 소속"}
                    </span>
                    {teamData ? (
                        <MyTeamCard
                            teamId={teamData.id}
                            teamName={teamData.team_name}
                            captainName={playerData.name} // Assuming player is captain if this card exists? Or fetched captain name.
                            description={teamData.description}
                            isRegistered={true}
                            emblemUrl={teamData.emblem_url}
                            title={sportName.includes('복싱') || sportName.includes('BOXING') || sportName.includes('주짓수') || sportName.includes('유도') || sportName.includes('MMA') || sportName.includes('킥복싱') ? "내 체육관" : "나의 팀"}
                            sportType={playerData.sport_type}
                            rating={5.0} // Mock
                            history={['WIN', 'DRAW', 'WIN', 'LOSS', 'WIN']} // Mock
                            isCaptain={teamData.captain_id === playerData.user_id}
                            representativePlayers={teamData.representative_players}
                        />
                    ) : (
                        // Optional: Show "Join/Create Team" placeholder or nothing? 
                        // User prompt said "Inner Card 2 (My Team Info): (If team exists)"
                        // But maybe show a "Not in team" stub if appropriate?
                        // For now, render nothing if no team, or render Empty Team Card logic if I had one.
                        // I'll render nothing if no teamData is passed.
                        null
                    )}
                </div>
            </div>

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
