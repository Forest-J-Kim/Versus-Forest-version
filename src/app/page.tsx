"use client";

import Link from "next/link";
import styles from "./home.module.css"; // We can reuse or adjust styles

export default function Home() {
    return (
        <main className={styles.container}>
            <h1 className={styles.headerTitle}>
                Who are you<br />playing as?
            </h1>

            <div className={styles.splitLayout}>
                {/* Solo Card */}
                <Link href="/sports?mode=SOLO" className={`${styles.bigCard} ${styles.soloCard}`}>
                    <div className={styles.bigIcon}>👤</div>
                    <div className={styles.bigLabel}>
                        <h2>SOLO</h2>
                        <p>Individual / Mercenary</p>
                    </div>
                </Link>

                {/* Team Card */}
                <Link href="/sports?mode=TEAM" className={`${styles.bigCard} ${styles.teamCard}`}>
                    <div className={styles.bigIcon}>🛡️</div>
                    <div className={styles.bigLabel}>
                        <h2>TEAM</h2>
                        <p>Club / Scrimmage</p>
                    </div>
                </Link>
            </div>
        </main>
    );
}
