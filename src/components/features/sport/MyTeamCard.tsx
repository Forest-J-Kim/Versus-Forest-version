"use client";

import React from 'react';
import styles from './MyTeamCard.module.css';

interface MyTeamCardProps {
    teamName: string;
    captainName: string;
    rating: number; // 0-5
    history: ('WIN' | 'DRAW' | 'LOSS')[];
    isRegistered?: boolean; // If false, show 'Register Team' prompt
}

export default function MyTeamCard({ teamName, captainName, rating, history, isRegistered = true }: MyTeamCardProps) {
    if (!isRegistered) {
        return (
            <div className={styles.card} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px', background: '#F9FAFB' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚽</div>
                    <div style={{ fontWeight: 'bold', color: '#374151' }}>나의 소속팀 정보가 없습니다</div>
                    <button style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        + 팀 등록 신청하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <span className={styles.sectionTitle}>나의 팀</span>
                <a href="#" className={styles.moreLink}>+ 더보기</a>
            </div>

            <div className={styles.teamContent}>
                <div className={styles.emblem}>🛡️</div>
                <div className={styles.info}>
                    <div className={styles.teamName}>{teamName}</div>
                    <div className={styles.teamMeta}>주장: {captainName}</div>
                    <div className={styles.teamMeta}>
                        평점: <span className={styles.stars}>{"★".repeat(Math.floor(rating))}</span>
                    </div>
                </div>
            </div>

            <div className={styles.historyTitle}>매치 히스토리</div>
            <div className={styles.historyRow}>
                {history.map((result, idx) => (
                    <div
                        key={idx}
                        className={`${styles.badge} ${result === 'WIN' ? styles.win : result === 'DRAW' ? styles.draw : styles.loss}`}
                    >
                        {result === 'WIN' ? '승' : result === 'DRAW' ? '무' : '패'}
                    </div>
                ))}
            </div>
        </div>
    );
}
