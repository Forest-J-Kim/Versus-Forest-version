"use client";

import { useMode } from "@/components/providers/ModeProvider";
import styles from "./MatchBoard.module.css";

interface Match {
    id: string;
    type: string;
    status: string;
    date?: string;
    location?: string;
    description?: string;
    hostUser?: { name: string; position: string | null; tier: string | null };
    hostTeam?: { name: string; region: string | null; tier: string | null };
    guestUser?: { name: string };
    guestTeam?: { name: string };
}

interface MatchBoardProps {
    initialMatches: Match[];
}

export default function MatchBoard({ initialMatches }: MatchBoardProps) {
    const { mode } = useMode();

    // Filter matches based on mode
    // INDIVIDUAL -> Show PVP and TVP (Team seeks Player)
    // TEAM -> Show TVT

    const filteredMatches = initialMatches.filter((match) => {
        if (mode === "INDIVIDUAL") {
            return match.type === "PVP" || match.type === "TVP";
        } else {
            return match.type === "TVT";
        }
    });

    return (
        <div className={styles.board}>
            <div className={styles.tabs}>
                <button className={`${styles.tab} ${styles.active}`}>All Matches</button>
                <button className={styles.tab}>Nearby</button>
                <button className={styles.tab}>Scheduled</button>
            </div>

            <div className={styles.matchList}>
                {filteredMatches.length > 0 ? (
                    filteredMatches.map((match) => (
                        <div key={match.id} className={`glass-panel ${styles.matchCard}`}>
                            <div className={styles.matchHeader}>
                                <span className={`status-badge ${match.status === 'MATCHED' ? 'matched' : 'pending'}`}>
                                    {match.status}
                                </span>
                                <span className={styles.date}>
                                    {match.date
                                        ? new Date(match.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                        : 'Date TBD'}
                                </span>
                            </div>

                            <div className={styles.versus}>
                                <div className={styles.side}>
                                    <div className={styles.avatar}>
                                        {/* Placeholder Avatar Logic using Initials */}
                                        {(match.hostTeam ? match.hostTeam.name : match.hostUser?.name || "?").slice(0, 1)}
                                    </div>
                                    <div className={styles.name}>
                                        {match.hostTeam ? match.hostTeam.name : match.hostUser?.name}
                                    </div>
                                    <div className={styles.meta}>
                                        {match.hostTeam ? match.hostTeam.tier : match.hostUser?.tier}
                                    </div>
                                </div>

                                <div className={styles.vs}>VS</div>

                                <div className={styles.side}>
                                    <div className={styles.avatar} style={!match.guestTeam && !match.guestUser ? { borderStyle: 'dashed', background: 'transparent', border: '2px dashed #cbd5e1' } : {}}>
                                        {match.guestTeam
                                            ? match.guestTeam.name.slice(0, 1)
                                            : (match.guestUser ? match.guestUser.name.slice(0, 1) : "+")}
                                    </div>
                                    <div className={styles.name}>
                                        {match.guestTeam ? match.guestTeam.name : (match.guestUser?.name || "Open Slot")}
                                    </div>
                                    <div className={styles.meta}>
                                        {match.guestTeam ? "Away Team" : (match.guestUser ? "Challenger" : "Waiting")}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.details}>
                                {match.location && <div className={styles.location}>📍 {match.location}</div>}
                                {match.description && <div className={styles.desc}>"{match.description}"</div>}
                            </div>

                            <button className={styles.actionBtn}>
                                {match.status === 'MATCHED' ? 'View Details' : 'Challenge'}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className={styles.empty}>
                        <p>No matches found for {mode === "INDIVIDUAL" ? "Individual" : "Team"} mode.</p>
                        <button className={styles.createBtn}>
                            Create {mode === "INDIVIDUAL" ? "Match Request" : "Team Challenge"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
