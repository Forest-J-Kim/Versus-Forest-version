"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';

export default function WelcomePage() {
    const router = useRouter();

    return (
        <main className={styles.container}>
            <div className={styles.logoArea}>
                <h1 className={styles.logoText}>VERSUS</h1>
                <p className={styles.subText}>당신의 라이벌을 찾으세요</p>
            </div>

            <div className={styles.form}>
                <button
                    className={`${styles.button} ${styles.primaryBtn}`}
                    onClick={() => router.push('/login')}
                >
                    로그인
                </button>
                <button
                    className={`${styles.button} ${styles.secondaryBtn}`}
                    onClick={() => router.push('/signup')}
                >
                    회원가입
                </button>
            </div>
        </main>
    );
}
