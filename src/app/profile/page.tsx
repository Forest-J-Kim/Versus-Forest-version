"use client";

import React, { useEffect, useState } from 'react';
import styles from './profile.module.css';
import { SPORTS, Sport } from "@/app/page";
import { createClient } from "@/utils/supabase/client";
import CaptainRegistrationModal from '@/components/features/profile/CaptainRegistrationModal';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<{ id: string; name: string; email?: string; roles: any } | null>(null);
    const [isCaptainModalOpen, setIsCaptainModalOpen] = useState(false);

    // Currently we don't have a 'user_sports' table, so this will always be empty initially.
    // In the future, this should be fetched from a table linking users to sports/profiles.
    const [mySports, setMySports] = useState<any[]>([]);

    const fetchUser = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*') // Select all to get roles and potential future columns
                .eq('id', user.id)
                .single();

            // Prioritize nickname/username from DB
            const displayName = profile?.nickname || profile?.username || profile?.full_name || user.email?.split('@')[0] || "회원";

            setUserProfile({
                id: user.id,
                name: displayName,
                email: user.email,
                roles: profile?.roles || {}
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handleCaptainSuccess = () => {
        fetchUser(); // Refresh profile to get updated roles
    };

    if (loading) {
        return <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>로딩 중...</div>;
    }

    if (!userProfile) {
        return <div className={styles.container}>로그인이 필요합니다.</div>;
    }

    // Determine Captain Badges from Roles
    const captainBadges = userProfile.roles ? Object.keys(userProfile.roles).filter(key => userProfile.roles[key] === 'captain') : [];

    return (
        <main className={styles.container}>
            {/* 1. Integrated Info Header */}
            <h1 className={styles.sectionTitle}>내 정보</h1>
            <section className={styles.headerSection}>
                <div className={styles.avatarContainer}>
                    <div className={styles.avatar}>👤</div>
                </div>
                <div className={styles.userName}>{userProfile.name}</div>

                {/* Captain Badges Display */}
                {captainBadges.length > 0 && (
                    <div className={styles.userTypeBadge}>
                        <span style={{ fontWeight: 'bold', color: '#4B5563', marginRight: '4px' }}>CAPTAIN</span>
                        {captainBadges.map(sportKey => {
                            const sport = SPORTS.find(s => s.id === sportKey.toUpperCase());
                            return (
                                <span key={sportKey} style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                                    {sport?.icon}
                                </span>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={() => setIsCaptainModalOpen(true)}
                    style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        backgroundColor: '#F3F4F6',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}
                >
                    👑 캡틴/관장 등록하기
                </button>
            </section>

            {/* 2. Registered Sports List (Empty State Handling) */}
            <section className={styles.sportsSection} style={{ minHeight: '200px' }}>
                <h2 className={styles.sectionTitle}>내 종목 프로필</h2>

                {mySports.length === 0 ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem', backgroundColor: '#F9FAFB', borderRadius: '1rem', border: '1px dashed #D1D5DB',
                        color: '#6B7280'
                    }}>
                        <p style={{ marginBottom: '1rem' }}>등록된 종목 정보가 없습니다.</p>
                        <button
                            className={styles.addSportButton}
                            style={{ width: 'auto', padding: '0.5rem 1.5rem', fontSize: '0.9rem', borderRadius: '0.5rem' }}
                            onClick={() => alert("종목 추가 기능 준비 중입니다.")}
                        >
                            + 프로필 등록하기
                        </button>
                    </div>
                ) : (
                    <div className={styles.horizontalScroll}>
                        {/* Render actual sports list here in future */}
                    </div>
                )}
            </section>

            <CaptainRegistrationModal
                isOpen={isCaptainModalOpen}
                onClose={() => setIsCaptainModalOpen(false)}
                onSuccess={handleCaptainSuccess}
                userId={userProfile.id}
            />
        </main>
    );
}
