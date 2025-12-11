"use client";

import { useMode } from "@/components/providers/ModeProvider";
import styles from "./ModeSwitcher.module.css";

export default function ModeSwitcher() {
    const { mode, toggleMode } = useMode();

    return (
        <button
            className={`${styles.switcher} ${mode === "TEAM" ? styles.teamMode : ""}`}
            onClick={toggleMode}
            aria-label="Toggle Mode"
        >
            <div className={styles.slider}>
                <span className={styles.label}>{mode === "INDIVIDUAL" ? "Individual" : "Team"}</span>
            </div>
        </button>
    );
}
