"use client";

import React from 'react';
import styles from './emptyProfile.module.css';

interface EmptyProfileCardProps {
    sportName: string;
    onClick?: () => void;
}

export default function EmptyProfileCard({ sportName, onClick }: EmptyProfileCardProps) {
    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.icon}>+</div>
            <div className={styles.text}>{sportName} 프로필 등록하기</div>
        </div>
    );
}
