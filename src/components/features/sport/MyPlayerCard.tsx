"use client";

import React from 'react';
import styles from './MyPlayerCard.module.css';

interface MyPlayerCardProps {
    name: string;
    gymName: string;
    style: string; // e.g., Orthodox, Southpaw
    level: string; // e.g., Amateur Lv.3
    imageUrl?: string;
}

export default function MyPlayerCard({ name, gymName, style, level, imageUrl }: MyPlayerCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <span className={styles.sectionTitle}>내 정보</span>
                <span className={styles.editLink}>수정</span>
            </div>

            <div className={styles.contentRow}>
                <div className={styles.profileImage}>
                    {imageUrl ? <img src={imageUrl} alt={name} /> : '👤'}
                </div>
                <div className={styles.infoCol}>
                    <div className={styles.name}>{name}</div>
                    <div className={styles.gym}>{gymName}</div>
                    <div className={styles.tags}>
                        <span className={styles.tag}>{style}</span>
                        <span className={styles.tag}>{level}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
