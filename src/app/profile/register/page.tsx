"use client";

import React from "react";
import styles from "./register.module.css";
import { useRouter } from "next/navigation";

// Redefine DumbbellIcon locally for simplicity or import if shared (assuming copy for now to avoid breaking changes elsewhere)
const DumbbellIcon = () => (
    <svg width="1em" height="1em" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="6" height="20" rx="2" fill="#374151" />
        <rect x="2" y="6" width="6" height="20" rx="2" fill="url(#grad1)" />
        <rect x="24" y="6" width="6" height="20" rx="2" fill="#374151" />
        <rect x="24" y="6" width="6" height="20" rx="2" fill="url(#grad1)" />
        <rect x="8" y="13" width="16" height="6" fill="#9CA3AF" />
        <rect x="8" y="13" width="16" height="6" fill="url(#grad2)" />
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

// Define Sports List Locally to ensure independence and styling control
const REGISTER_SPORTS = [
    { id: 'SOCCER', name: '축구/풋살', icon: '⚽' },
    { id: 'BOXING', name: '복싱', icon: '🥊' },
    { id: 'BASKETBALL', name: '농구', icon: '🏀' },
    { id: 'BASEBALL', name: '야구', icon: '⚾' },
    { id: 'RACKET', name: '배드민턴/테니스', icon: '🏸' },
    { id: 'KICKBOXING', name: '킥복싱/MMA', icon: '🦵' },
    { id: 'JUDO', name: '유도/주짓수', icon: '🥋' },
    { id: 'HEALTH', name: '헬스', icon: <div style={{ display: 'flex', fontSize: '1em' }}><DumbbellIcon /></div> },
];

export default function RegisterSportPage() {
    const router = useRouter();

    const handleSportSelect = (sportName: string, sportId: string) => {
        router.push(`/profile/register/${sportId.toUpperCase()}`);
    };

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>어떤 종목의<br />프로필을 등록해 볼까요?</h1>
                <p className={styles.subtitle}>원하는 종목을 선택해주세요.</p>
            </header>

            <div className={styles.sportGrid}>
                {REGISTER_SPORTS.map((sport) => (
                    <div
                        key={sport.id}
                        className={styles.sportCard}
                        onClick={() => handleSportSelect(sport.name, sport.id)}
                    >
                        <div className={styles.sportIcon}>{sport.icon}</div>
                        <span className={styles.sportName}>{sport.name}</span>
                    </div>
                ))}
            </div>
        </main>
    );
}
