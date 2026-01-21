"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
    const pathname = usePathname();

    // Standardized Items: Home, Message, MyInfo
    const isAuthPage = ['/welcome', '/login', '/signup'].some(path => pathname.startsWith(path));
    const isEditPage = pathname.includes('/team/edit/');

    if (isAuthPage || isEditPage) return null;

    return (
        <nav className={styles.nav}>
            <Link href="/" className={`${styles.item} ${pathname === "/" ? styles.active : ""}`}>
                <span className={styles.icon}>🏠</span>
                <span className={styles.label}>홈</span>
            </Link>
            <Link href="/messages" className={`${styles.item} ${pathname.startsWith("/messages") ? styles.active : ""}`}>
                <span className={styles.icon}>💬</span>
                <span className={styles.label}>메세지</span>
            </Link>
            <Link href="/profile" className={`${styles.item} ${pathname.startsWith("/profile") ? styles.active : ""}`}>
                <span className={styles.icon}>👤</span>
                <span className={styles.label}>내 정보</span>
            </Link>
        </nav>
    );
}
