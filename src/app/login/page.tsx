"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import { login } from '@/app/auth/actions';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        try {
            const result = await login(null, formData);

            if (result?.error) {
                alert(`로그인 실패: ${result.error}`);
                setLoading(false);
            } else if (result?.success) {
                // Successful login
                alert("환영합니다!");
                // Force full reload to update Middleware/Server Components with new Cookie
                window.location.href = '/';
            }
        } catch (err: any) {
            console.error("Login Error:", err);
            alert(`오류: ${err.message}`);
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.logoArea} style={{ marginBottom: '2rem' }}>
                <h1 className={styles.logoText} style={{ fontSize: '2rem' }}>Login</h1>
            </div>

            <form className={styles.form} onSubmit={handleLogin}>
                <div>
                    <label className={styles.label}>이메일</label>
                    <input
                        type="email"
                        className={styles.input}
                        placeholder="example@versus.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className={styles.label}>비밀번호</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className={`${styles.button} ${styles.primaryBtn}`} style={{ marginTop: '1.5rem' }} disabled={loading}>
                    {loading ? '로그인 중...' : '로그인하기'}
                </button>
            </form>

            <div className={styles.linkBtn} onClick={() => router.push('/signup')}>
                계정이 없으신가요? 회원가입
            </div>

            <div className={styles.linkBtn} onClick={() => router.push('/welcome')} style={{ marginTop: '0.5rem', textDecoration: 'none' }}>
                ← 뒤로가기
            </div>
        </main>
    );
}
