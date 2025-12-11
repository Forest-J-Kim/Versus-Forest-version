"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./Header.module.css";
import ModeSwitcher from "@/components/ui/ModeSwitcher";

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();

    const isHome = pathname === "/";
    const isMatches = pathname === "/matches";

    const goBack = () => {
        router.back();
    };

    return (
        <header className={styles.header}>
            {isHome ? (
                <div className={styles.logo}>VERSUS</div>
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
