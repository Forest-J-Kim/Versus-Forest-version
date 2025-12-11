"use client";

import Link from "next/link";
import styles from "./FAB.module.css";

export default function FAB() {
    return (
        <Link href="/matches/new" className={styles.fab}>
            <span className={styles.icon}>+</span>
        </Link>
    );
}
