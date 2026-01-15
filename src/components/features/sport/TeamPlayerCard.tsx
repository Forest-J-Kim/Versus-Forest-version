"use client";

import React from 'react';
import styles from './TeamPlayerCard.module.css';

interface TeamPlayerCardProps {
    name: string;
    position: string; // e.g., "FW / 윙어"
    imageUrl?: string;
}

export default function TeamPlayerCard({ name, position, imageUrl }: TeamPlayerCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <span className={styles.sectionTitle}>내 선수 정보</span>
                <span className={styles.editLink}>수정</span>
            </div>

            <div className={styles.contentRow}>
                <div className={styles.profileImage}>
                    {imageUrl ? <img src={imageUrl} alt={name} /> : '👤'}
                </div>
                <div className={styles.infoCol}>
                    <div className={styles.name}>{name}</div>
                    <div className={styles.position}>{position}</div>
                </div>
            </div>
        </div>
    );
}
