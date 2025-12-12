"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";
import { useMode } from "@/components/providers/ModeProvider";

export default function BottomNav() {
    const pathname = usePathname();
    const { isManagerMode } = useMode();

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

    return (
        <nav className={styles.nav}>
            <Link href="/" className={`${styles.item} ${pathname === "/" ? styles.active : ""}`}>
                <span className={styles.icon}>{isManagerMode ? "📊" : "🏠"}</span>
                <span className={styles.label}>{isManagerMode ? "대시보드" : "홈"}</span>
            </Link>
            <Link href="/matches" className={`${styles.item} ${isActive("/matches") ? styles.active : ""}`}>
                <span className={styles.icon}>{isManagerMode ? "📩" : "🥊"}</span>
                <span className={styles.label}>{isManagerMode ? "시합 수락" : "매칭 찾기"}</span>
            </Link>
            <Link href="/profile" className={styles.item}>
                <span className={styles.icon}>👤</span>
                <span className={styles.label}>{isManagerMode ? "선수 등록" : "내 정보"}</span>
            </Link>
        </nav>
    );
}
