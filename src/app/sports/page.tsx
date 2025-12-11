"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { sportConfig } from "@/lib/sportConfig";
import styles from "./sport.module.css";

export default function SportSelection() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") || "SOLO"; // Default to SOLO if missing

    const sports = sportConfig[mode] || {}; // Get sports for this mode

    return (
        <main className={styles.container}>
            <h1 className={styles.title}>
                Choose your<br />
                <span className={styles.highlight}>{mode}</span> Sport
            </h1>

            <div className={styles.grid}>
                {Object.values(sports).map((sport) => (
                    <Link
                        key={sport.id}
                        href={`/matches/new?mode=${mode}&sport=${sport.id}`}
                        className={styles.card}
                        style={{ backgroundColor: sport.color, borderColor: sport.border }}
                    >
                        <div className={styles.icon}>{sport.icon}</div>
                        <div className={styles.label}>{sport.name}</div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
