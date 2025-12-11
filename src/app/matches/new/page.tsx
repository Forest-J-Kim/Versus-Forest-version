"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sportConfig } from "@/lib/sportConfig";
import styles from "./wizard.module.css";

// Removed matchTypes and tagsList

// Removed mock config



export default function NewMatchWizard() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Added

    const mode = searchParams.get("mode") || "SOLO"; // Added
    const sportId = searchParams.get("sport") || "BOXING"; // Added

    const sportDef = sportConfig[mode]?.[sportId]; // Added

    // Generic State
    const [formData, setFormData] = useState<Record<string, any>>({}); // Changed
    const [date, setDate] = useState("Today"); // Changed

    if (!sportDef) { // Added
        return <div className={styles.container}>Invalid Sport Configuration</div>; // Added
    }

    const handleCreate = async () => {
        // Post to API with mode, sport, and stringified JSON attributes
        const payload = {
            mode,
            sport: sportId,
            date,
            attributes: JSON.stringify(formData)
        };
        console.log("Creating:", payload);
        // await prisma... (mock)
        router.push("/matches");
    };

    // Helper to update form data
    const updateField = (key: string, value: any) => { // Added
        setFormData(prev => ({ ...prev, [key]: value })); // Added
    };

    return (
        <main className={styles.container}>
            {/* Header */}
            <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>{sportDef.icon} {sportDef.name}</h1>

            {/* Dynamic Preview */}
            <section className={styles.previewSection}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.badge}>{mode}</div>
                        <div className={styles.dateBadge}>{date}</div>
                    </div>
                    <div className={styles.cardTitle}>
                        {/* Try to display some meaningful summary */}
                        {Object.entries(formData).slice(0, 2).map(([k, v]) => `${v}`).join(' • ') || "New Match"}
                    </div>
                    <div className={styles.tags}>
                        {formData['tags']?.map((t: string) => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                </div>
            </section>

            <div className={styles.form}>

                {/* Date (Common) */}
                <div className={styles.section}>
                    <h3>When?</h3>
                    <div className={styles.grid4}>
                        {["Today", "Tomorrow", "Weekend", "Pick"].map((d) => (
                            <button
                                key={d}
                                className={`${styles.dateBtn} ${date === d ? styles.active : ""}`}
                                onClick={() => setDate(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Fields */}
                {sportDef.fields.map((field) => {
                    const val = formData[field.key];

                    return (
                        <div key={field.key} className={styles.section}>
                            <h3>{field.label}: {val} {field.unit}</h3>

                            {/* Slider Type */}
                            {field.type === 'slider' && (
                                <input
                                    type="range"
                                    min={field.min}
                                    max={field.max}
                                    value={val || field.min}
                                    onChange={(e) => updateField(field.key, Number(e.target.value))}
                                    className={styles.slider}
                                />
                            )}

                            {/* Chips Type */}
                            {field.type === 'chips' && (
                                <div className={styles.chips}>
                                    {field.options?.map(opt => (
                                        <button
                                            key={opt}
                                            className={`${styles.chip} ${val === opt ? styles.active : ""}`}
                                            onClick={() => updateField(field.key, opt)}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Toggle Type */}
                            {field.type === 'toggle' && (
                                <div className={styles.toggleGroup}>
                                    {field.options?.map(opt => (
                                        <button
                                            key={opt}
                                            className={`${styles.toggle} ${val === opt ? styles.active : ""}`}
                                            onClick={() => updateField(field.key, opt)}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Tags Type */}
                            {field.type === 'tags' && (
                                <div className={styles.tagsGrid}>
                                    {field.tags?.map(tag => (
                                        <button
                                            key={tag}
                                            className={`${styles.tagBtn} ${val?.includes(tag) ? styles.active : ""}`}
                                            onClick={() => {
                                                const currentTags = val || [];
                                                const newTags = currentTags.includes(tag)
                                                    ? currentTags.filter((t: string) => t !== tag)
                                                    : [...currentTags, tag];
                                                updateField(field.key, newTags);
                                            }}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

            </div>

            <button className={styles.submitBtn} onClick={handleCreate}>
                Post Match
            </button>

        </main>
    );
}
