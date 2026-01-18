"use client";

import React from 'react';
import styles from './MyPlayerCard.module.css';

interface MyPlayerCardProps {
    name: string;
    gymName: string;
    tags: string[];
    imageUrl?: string;
    onEdit?: () => void;
}

export default function MyPlayerCard({ name, gymName, tags, imageUrl, onEdit }: MyPlayerCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <span className={styles.sectionTitle}>내 정보</span>
                {onEdit && <span className={styles.editLink} onClick={onEdit}>수정</span>}
            </div>

            <div className={styles.contentRow}>
                <div className={styles.profileImage}>
                    {imageUrl ? <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                </div>
                <div className={styles.infoCol}>
                    <div className={styles.name}>{name}</div>
                    <div className={styles.gym}>{gymName}</div>
                    <div className={styles.tags}>
                        {tags.map((tag, i) => (
                            <span key={i} className={styles.tag}>{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
