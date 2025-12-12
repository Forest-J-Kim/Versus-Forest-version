"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./Header.module.css";
import ModeSwitcher from "@/components/ui/ModeSwitcher";
import { useMode } from "@/components/providers/ModeProvider";

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { isManagerMode, toggleManagerMode } = useMode();

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
                    <button
                        onClick={toggleManagerMode}
                        style={{
                            fontSize: '0.8rem',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: isManagerMode ? '#1F2937' : '#EFF6FF',
                            color: isManagerMode ? '#FFF' : '#2563EB',
                            border: '1px solid #E5E7EB',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isManagerMode ? "🛡️ 관장님 ON" : "🛡️ 관장님 모드"}
                    </button>
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
