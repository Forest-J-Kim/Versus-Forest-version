"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

    return (
        <nav className={styles.nav}>
            <Link href="/" className={`${styles.item} ${pathname === "/" ? styles.active : ""}`}>
                <span className={styles.icon}>🏠</span>
                <span className={styles.label}>Home</span>
            </Link>
            <Link href="/matches" className={`${styles.item} ${isActive("/matches") ? styles.active : ""}`}>
                <span className={styles.icon}>⚔️</span>
                <span className={styles.label}>Matches</span>
            </Link>
            <Link href="/chat" className={styles.item}>
                <span className={styles.icon}>💬</span>
                <span className={styles.label}>Chat</span>
            </Link>
            <Link href="/profile" className={styles.item}>
                <span className={styles.icon}>👤</span>
                <span className={styles.label}>My</span>
            </Link>
        </nav>
    );
}
