"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
    const pathname = usePathname();

    // Standardized Items: Home, Message, My Match, My Info
    // 특정 페이지(로그인, 회원가입 등)에서는 하단바 숨김 처리
    const isAuthPage = ['/welcome', '/login', '/signup'].some((path => pathname.startsWith(path)));
    // 팀/선수 편집 페이지 등에서도 숨길 경우 추가 가능
    const isEditPage = pathname.includes('/team/edit/') || pathname.includes('/profile/edit/');

    if (isAuthPage || isEditPage) return null;

    return (
        <nav className={styles.nav}>

            {/* 1. 홈 */}
            <Link href="/" className={`${styles.item} ${pathname === "/" ? styles.active : ""}`}>
                <span className={styles.icon}>🏠</span>
                <span className={styles.label}>홈</span>
            </Link>

            {/* 2. 메시지 (순서 변경됨) */}
            <Link href="/messages" className={`${styles.item} ${pathname.startsWith("/messages") ? styles.active : ""}`}>
                <span className={styles.icon}>💬</span>
                <span className={styles.label}>메세지</span>
            </Link>

            {/* 3. 내 매치 (새로 추가됨!) */}
            <Link href="/my-matches" className={`${styles.item} ${pathname.startsWith("/my-matches") ? styles.active : ""}`}>
                <span className={styles.icon} style={{ fontWeight: 600, fontSize: "1.1rem", fontStyle: "italic", letterSpacing: "-1px" }}>VS</span>
                <span className={styles.label}>내 매치</span>
            </Link>

            {/* 4. 내 정보 */}
            <Link href="/profile" className={`${styles.item} ${pathname.startsWith("/profile") ? styles.active : ""}`}>
                <span className={styles.icon}>👤</span>
                <span className={styles.label}>내 정보</span>
            </Link>

        </nav>
    );
}