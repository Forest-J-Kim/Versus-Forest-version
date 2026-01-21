"use client";

import React from 'react';
import styles from './MyPlayerCard.module.css';

interface MyPlayerCardProps {
    name: string;
    gymName: string;
    tags: string[];
    imageUrl?: string;
    onEdit?: () => void;
    hasTeam?: boolean;
    requestStatus?: string | null;
    onFindTeam?: () => void;
}

export default function MyPlayerCard({ name, gymName, tags, imageUrl, onEdit, hasTeam = false, requestStatus = null, onFindTeam }: MyPlayerCardProps) {
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

            {/* Join Team / Request Status Section */}
            {!hasTeam && onFindTeam && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem' }}>
                    {requestStatus === 'pending' ? (
                        <div style={{
                            width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                            backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.875rem',
                            textAlign: 'center', fontWeight: 'bold'
                        }}>
                            🕒 승인 대기 중...
                        </div>
                    ) : (
                        <button
                            onClick={onFindTeam}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                border: '1px solid #D1D5DB', backgroundColor: 'white',
                                color: '#374151', fontSize: '0.875rem', fontWeight: '600',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                            }}
                        >
                            🔍 소속팀/체육관 찾기
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
