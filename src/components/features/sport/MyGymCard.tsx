"use client";

import React from 'react';
import styles from './MyGymCard.module.css';

interface MyGymCardProps {
    gymName: string;
    location: string;
    proCount: number;
    amateurCount: number;
}

export default function MyGymCard({ gymName, location, proCount, amateurCount }: MyGymCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <span className={styles.sectionTitle}>내 체육관</span>
                <a href="#" className={styles.moreLink}>관리</a>
            </div>

            <div className={styles.contentRow}>
                <div className={styles.logo}>🥊</div>
                <div className={styles.infoCol}>
                    <div className={styles.gymName}>{gymName}</div>
                    <div className={styles.location}>{location}</div>
                </div>
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>등록 선수</span>
                    <span className={styles.statValue}>총 {proCount + amateurCount}명</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>준프로/프로</span>
                    <span className={styles.statValue}>{proCount}명</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>아마추어</span>
                    <span className={styles.statValue}>{amateurCount}명</span>
                </div>
            </div>
        </div>
    );
}
