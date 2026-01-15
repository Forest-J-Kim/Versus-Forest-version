"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./Header.module.css";
import ModeSwitcher from "@/components/ui/ModeSwitcher";
import { useMode } from "@/components/providers/ModeProvider";

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { isManagerMode, toggleManagerMode } = useMode();
    const [user, setUser] = useState<User | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        // Listen for auth state changes (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/welcome');
    };

    const isAuthPage = ['/welcome', '/login', '/signup'].some(path => pathname.startsWith(path));
    if (isAuthPage) return null;

    const isHome = pathname === "/";
    const isMatches = pathname === "/matches";

    const goBack = () => {
        router.back();
    };

    return (
        <header className={styles.header}>
            {isHome ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className={styles.logo}>VERSUS</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {user ? (
                            <>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600' }} onClick={() => router.push('/profile')} className={styles.profileLink}>
                                    내 정보
                                </span>
                                <button onClick={handleLogout} className={styles.backBtn} style={{ fontSize: '0.8rem' }}>
                                    로그아웃
                                </button>
                            </>
                        ) : (
                            <button onClick={() => router.push('/login')} className={styles.backBtn} style={{ fontSize: '0.8rem', width: 'auto', padding: '0.3rem 0.8rem' }}>
                                로그인
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className={styles.subHeader}>
                    <button onClick={goBack} className={styles.backBtn}>
                        ←
                    </button>
                    <span className={styles.title}>
                        {isMatches ? "Matches" : "Page"}
                    </span>
                    {isMatches && <div className={styles.switcherWrapper}><ModeSwitcher /></div>}
                </div>
            )}
        </header>
    );
}
