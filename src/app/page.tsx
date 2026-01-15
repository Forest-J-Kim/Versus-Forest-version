"use client";

import React from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

// Shared Sport Interface & Data
export interface Sport {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    type: 'TEAM' | 'COMBAT' | 'RACKET' | 'INDIVIDUAL';
}

// Custom Icons
const DumbbellIcon = () => (
    <svg width="1em" height="1em" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left Weight */}
        <rect x="2" y="6" width="6" height="20" rx="2" fill="#374151" />
        <rect x="2" y="6" width="6" height="20" rx="2" fill="url(#grad1)" />
        {/* Right Weight */}
        <rect x="24" y="6" width="6" height="20" rx="2" fill="#374151" />
        <rect x="24" y="6" width="6" height="20" rx="2" fill="url(#grad1)" />
        {/* Handle */}
        <rect x="8" y="13" width="16" height="6" fill="#9CA3AF" />
        <rect x="8" y="13" width="16" height="6" fill="url(#grad2)" />
        {/* Shine */}
        <defs>
            <linearGradient id="grad1" x1="2" y1="6" x2="8" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0.3" />
                <stop offset="1" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="grad2" x1="8" y1="13" x2="8" y2="19" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0.5" />
                <stop offset="1" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
        </defs>
    </svg>
);

export const SPORTS: Sport[] = [
    { id: 'SOCCER', name: '축구/풋살', icon: '⚽', color: '#EFF6FF', type: 'TEAM' },
    { id: 'BOXING', name: '복싱', icon: '🥊', color: '#FEF2F2', type: 'COMBAT' },
    { id: 'BASKETBALL', name: '농구', icon: '🏀', color: '#FFF7ED', type: 'TEAM' },
    { id: 'BASEBALL', name: '야구', icon: '⚾', color: '#F0FDF4', type: 'TEAM' },
    { id: 'RACKET', name: '배드민턴/테니스', icon: '🏸', color: '#FAF5FF', type: 'RACKET' },
    { id: 'KICKBOXING', name: '킥복싱/MMA', icon: '🦵', color: '#FFF1F2', type: 'COMBAT' },
    { id: 'JUDO', name: '유도/주짓수', icon: '🥋', color: '#F0F9FF', type: 'COMBAT' },
    { id: 'HEALTH', name: '헬스', icon: <span style={{ fontSize: '1em', display: 'inline-block' }}>🏋️‍♂️</span>, color: '#F3F4F6', type: 'INDIVIDUAL' },
];

export default function Home() {
    const router = useRouter();
    const [userName, setUserName] = useState<string>("로딩 중...");
    const [captainSports, setCaptainSports] = useState<string[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                // Fallback to email prefix if username/nickname is missing
                const displayName = profile?.nickname || profile?.username || profile?.full_name || user.email?.split('@')[0] || "회원";
                setUserName(displayName);

                // Parse Roles for Captain Status
                if (profile?.roles) {
                    const badges = Object.keys(profile.roles).filter(key => profile.roles[key] === 'captain');
                    console.log('Captain Roles found:', badges);
                    setCaptainSports(badges);
                }
            } else {
                setUserName("게스트");
                setCaptainSports([]);
            }
        };
        fetchUser();
    }, []);

    // Correcting SPORTS constant for render
    const RENDER_SPORTS: Sport[] = [
        ...SPORTS.slice(0, 7),
        { id: 'HEALTH', name: '헬스', icon: <div style={{ width: '1em', height: '1em' }}><DumbbellIcon /></div>, color: '#F3F4F6', type: 'INDIVIDUAL' }
    ];

    const handleSportClick = (sport: Sport) => {
        router.push(`/sports/${sport.id}`);
    };

    return (
        <main className={styles.container}>
            <header className={styles.intro}>
                <div className={styles.introHeaderRow}>
                    <div className={styles.introText}>
                        <h1 className={styles.introTitle}>{userName}님 안녕하세요,<br />오늘은 어떤 운동을<br />해 볼까요?</h1>
                    </div>
                    {/* Captain Badge Box - Only show if user has captain roles */}
                    {captainSports.length > 0 && (
                        <div className={styles.captainBadgeBox}>
                            <span className={styles.captainLabel}>캡틴</span>
                            <div className={styles.captainIcons}>
                                {captainSports.map((sportKey, idx) => {
                                    // Find icon matching the sport key (e.g., 'boxing', 'soccer')
                                    // Our IDs are uppercase (SOCCER), roles keys usually lowercase or mixed.
                                    const sport = RENDER_SPORTS.find(s => s.id === sportKey.toUpperCase());
                                    return <span key={idx} className={styles.miniIcon}>{sport ? sport.icon : '👑'}</span>
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.introSub}>원하는 종목을 선택해주세요.</div>
            </header>

            <div className={styles.sportGrid}>
                {RENDER_SPORTS.map((sport) => (
                    <div
                        key={sport.id}
                        className={styles.sportCard}
                        style={{ backgroundColor: sport.color }}
                        onClick={() => handleSportClick(sport)}
                    >
                        <div className={styles.sportIcon}>{sport.icon}</div>
                        <span className={styles.sportName}>{sport.name}</span>
                    </div>
                ))}
            </div>
        </main>
    );
}
