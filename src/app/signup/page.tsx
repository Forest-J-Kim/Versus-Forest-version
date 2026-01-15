"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import { signup } from '@/app/auth/actions'; // Import Server Action

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleInput = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);

        // Convert state to FormData for Server Action
        const payload = new FormData();
        payload.append('name', formData.name);
        payload.append('email', formData.email);
        payload.append('password', formData.password);

        try {
            // Call Server Action
            // Note: Server actions typically return data. Redirects happen on server but we catch errors here.
            const result = await signup(null, payload);

            // If result comes back with error (redirect didn't happen)
            if (result?.error) {
                alert(`회원가입 실패: ${result.error}`);
            }
            // If redirect happens, this code might not run, or promise resolves.
        } catch (err: any) {
            // Next.js Redirects throw an error 'NEXT_REDIRECT', we must ignore it
            if (err.message === 'NEXT_REDIRECT') {
                return; // Normal behavior
            }
            console.error("Submission Error:", err);
            alert(`오류: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.logoArea} style={{ marginBottom: '2rem' }}>
                <h1 className={styles.logoText} style={{ fontSize: '2rem' }}>Sign Up</h1>
            </div>

            <form className={styles.form} onSubmit={handleSignup}>
                <div>
                    <label className={styles.label}>닉네임</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="김헬스"
                        value={formData.name}
                        onChange={(e) => handleInput('name', e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className={styles.label}>이메일</label>
                    <input
                        type="email"
                        className={styles.input}
                        placeholder="example@versus.com"
                        value={formData.email}
                        onChange={(e) => handleInput('email', e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className={styles.label}>비밀번호</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="8자 이상 입력"
                        value={formData.password}
                        onChange={(e) => handleInput('password', e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className={styles.label}>비밀번호 확인</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="비밀번호 재입력"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInput('confirmPassword', e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className={`${styles.button} ${styles.primaryBtn}`} style={{ marginTop: '1.5rem' }} disabled={loading}>
                    {loading ? '서버 통신 중...' : '가입하기'}
                </button>
            </form>

            <div className={styles.linkBtn} onClick={() => router.push('/login')}>
                이미 계정이 있으신가요? 로그인
            </div>

            <div className={styles.linkBtn} onClick={() => router.push('/welcome')} style={{ marginTop: '0.5rem', textDecoration: 'none' }}>
                ← 뒤로가기
            </div>
        </main>
    );
}
