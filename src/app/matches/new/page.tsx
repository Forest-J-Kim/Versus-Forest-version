"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sportConfig } from "@/lib/sportConfig";
import styles from "./wizard.module.css";
import { useToast } from "@/components/providers/ToastProvider";
import { supabase } from "@/lib/supabaseClient";

export default function NewMatchWizard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();

    const mode = searchParams.get("mode") || "SOLO";
    const sportId = searchParams.get("sport") || "BOXING";
    const sportDef = sportConfig[mode]?.[sportId];

    // Generic State
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Date/Time Wizard State ---
    const [dateStep, setDateStep] = useState<"DATE" | "WEEKEND_DETAIL" | "TIME_SLOT" | "HOUR">("DATE");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [timeSlot, setTimeSlot] = useState<"AM" | "PM" | "EVE" | null>(null);
    const [finalDateIso, setFinalDateIso] = useState("");

    // --- Location State ---
    const [locationType, setLocationType] = useState<"HOME" | "AWAY" | "TBD">("HOME");

    // Hardcoded ID per request
    const TEMP_USER_ID = 'user-1234';

    if (!sportDef) {
        return <div className={styles.container}>Invalid Sport Configuration</div>;
    }

    // --- Logic for Date Wizard ---
    const handleDateMain = (choice: "TODAY" | "TOMORROW" | "WEEKEND" | "PICK") => {
        const now = new Date();
        if (choice === "TODAY") {
            setSelectedDate(now);
            setDateStep("TIME_SLOT"); // Skip to time slot
        } else if (choice === "TOMORROW") {
            const tmr = new Date(now);
            tmr.setDate(tmr.getDate() + 1);
            setSelectedDate(tmr);
            setDateStep("TIME_SLOT");
        } else if (choice === "WEEKEND") {
            setDateStep("WEEKEND_DETAIL");
        }
        // PICK is handled via native input trigger or UI toggle, typically handled separately
    };

    const handleLevel2Weekend = (day: "SAT" | "SUN") => {
        const d = new Date();
        const currentDay = d.getDay();
        let addDays = 0;

        // Find next Sat or Sun
        if (day === "SAT") addDays = (6 - currentDay + 7) % 7;
        if (day === "SUN") addDays = (0 - currentDay + 7) % 7;

        // If today is match, but late? Assume coming weekend. 
        if (addDays === 0 && d.getHours() > 20) addDays = 7;

        d.setDate(d.getDate() + addDays);
        setSelectedDate(d);
        setDateStep("TIME_SLOT");
    };

    const handleLevel2Pick = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        setSelectedDate(new Date(e.target.value));
        setDateStep("TIME_SLOT");
    };

    const handleLevel3TimeSlot = (slot: "AM" | "PM" | "EVE") => {
        setTimeSlot(slot);
        setDateStep("HOUR");
    };

    const handleLevel4Hour = (hour: number) => {
        if (!selectedDate) return;
        const d = new Date(selectedDate);
        d.setHours(hour, 0, 0, 0);
        setFinalDateIso(d.toISOString());
    };

    // Helper to render hours based on slot
    const getHoursForSlot = () => {
        if (timeSlot === "AM") return [9, 10, 11, 12];
        if (timeSlot === "PM") return [13, 14, 15, 16, 17];
        if (timeSlot === "EVE") return [18, 19, 20, 21, 22]; // Extended Night
        return [];
    };

    const handleCreate = async (e?: React.FormEvent) => {
        // Step 1: Immediate confirmation
        if (e) e.preventDefault();

        console.log("🔥 [Emergency] handleCreate triggered");
        alert("통신 시작: 데이터를 보냅니다...");

        try {
            // Step 2: Payload Construction & Logging
            const finalDate = finalDateIso || new Date().toISOString(); // Fallback to NOW if missing

            // Hardcoded Auth for consistency
            const AUTHOR_ID = 'anon-user';

            let locString = "장소 미정";
            if (locationType === "HOME") locString = "서울 복싱 (Home)";
            if (locationType === "AWAY") locString = "상대 체육관 희망 (Away)";

            const matchData = {
                mode: mode,
                sport: sportId,
                author_id: AUTHOR_ID,
                target_date: finalDate,
                location: locString,
                attributes: formData,
                status: 'OPEN'
            };

            console.log("📦 [Emergency] Sending Payload:", matchData);

            // Step 3: Supabase Insert (Direct)
            const { data, error } = await supabase
                .from('matches')
                .insert([matchData])
                .select();

            if (error) {
                console.error("❌ [Emergency] Supabase Error:", error);
                throw error;
            }

            console.log("✅ [Emergency] Success:", data);
            alert("✅ 등록 성공! DB 확인해보세요.");

            // Step 4: Force Redirect
            window.location.href = "/matches";

        } catch (err: any) {
            console.error("❌ [Emergency] Catch Block:", err);
            alert("❌ 에러 발생: " + (err.message || JSON.stringify(err)));
        }
    };

    const updateField = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    return (
        <main className={styles.container}>
            <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>{sportDef.icon} {sportDef.name}</h1>

            {/* Preview Card */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>SUMMARY</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                    {finalDateIso ? new Date(finalDateIso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : "일시를 선택해주세요"}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                    {locationType === 'HOME' ? '🏠 내 체육관 (Home)' : locationType === 'AWAY' ? '✈️ 원정 (Away)' : '🤝 장소 협의'}
                </div>
            </div>

            <div className={styles.form}>

                {/* --- Wizard Section --- */}
                <div className={styles.section}>
                    <h3>Step 1: 날짜 (Date)</h3>

                    {/* Level 1: Main Chips */}
                    <div className={styles.grid4} style={{ marginBottom: '8px' }}>
                        <button className={`${styles.dateBtn} ${dateStep !== 'DATE' && selectedDate?.getDate() === new Date().getDate() ? styles.active : ''}`} onClick={() => handleDateMain("TODAY")}>오늘</button>
                        <button className={`${styles.dateBtn} ${dateStep !== 'DATE' && selectedDate?.getDate() === new Date().getDate() + 1 ? styles.active : ''}`} onClick={() => handleDateMain("TOMORROW")}>내일</button>
                        <button className={`${styles.dateBtn}`} onClick={() => handleDateMain("WEEKEND")}>주말</button>
                        <input type="date" className={styles.dateInput} onChange={handleLevel2Pick} style={{ height: '100%', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0 8px' }} />
                    </div>

                    {/* Level 2: Weekend Detail */}
                    {dateStep === "WEEKEND_DETAIL" && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <button className={styles.subBtn} onClick={() => handleLevel2Weekend("SAT")}>토요일 (Sat)</button>
                            <button className={styles.subBtn} onClick={() => handleLevel2Weekend("SUN")}>일요일 (Sun)</button>
                        </div>
                    )}

                    {/* Level 3: Time Slot */}
                    {(dateStep === "TIME_SLOT" || dateStep === "HOUR" || finalDateIso) && (
                        <div style={{ marginTop: '1rem' }}>
                            <h3>Step 2: 시간대 (Time)</h3>
                            <div className={styles.grid3}>
                                <button className={`${styles.slotBtn} ${timeSlot === 'AM' ? styles.active : ''}`} onClick={() => handleLevel3TimeSlot("AM")}>오전 (09-12)</button>
                                <button className={`${styles.slotBtn} ${timeSlot === 'PM' ? styles.active : ''}`} onClick={() => handleLevel3TimeSlot("PM")}>오후 (13-17)</button>
                                <button className={`${styles.slotBtn} ${timeSlot === 'EVE' ? styles.active : ''}`} onClick={() => handleLevel3TimeSlot("EVE")}>저녁 (18-22)</button>
                            </div>
                        </div>
                    )}

                    {/* Level 4: Hour Picker */}
                    {(dateStep === "HOUR" || finalDateIso) && timeSlot && (
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {getHoursForSlot().map(h => (
                                    <button
                                        key={h}
                                        className={`${styles.hourBtn} ${finalDateIso && new Date(finalDateIso).getHours() === h ? styles.active : ''}`}
                                        onClick={() => handleLevel4Hour(h)}
                                    >
                                        {h}:00
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Location Toggle --- */}
                <div className={styles.section}>
                    <h3>Location (장소)</h3>
                    <div className={styles.grid3}>
                        <button className={`${styles.locBtn} ${locationType === 'HOME' ? styles.active : ''}`} onClick={() => setLocationType("HOME")}>
                            🏠 홈 (오세요)
                        </button>
                        <button className={`${styles.locBtn} ${locationType === 'AWAY' ? styles.active : ''}`} onClick={() => setLocationType("AWAY")}>
                            ✈️ 원정 (갈게요)
                        </button>
                        <button className={`${styles.locBtn} ${locationType === 'TBD' ? styles.active : ''}`} onClick={() => setLocationType("TBD")}>
                            🤝 장소 미정
                        </button>
                    </div>
                </div>

                {/* Dynamic Fields */}
                {sportDef.fields.map((field) => {
                    const val = formData[field.key];
                    return (
                        <div key={field.key} className={styles.section}>
                            <h3>{field.label}</h3>
                            {/* ... Simple implementation for other fields ... */}
                            {field.type === 'slider' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="range" min={field.min} max={field.max} value={val || field.min} onChange={(e) => updateField(field.key, Number(e.target.value))} style={{ flex: 1 }} />
                                    <span>{val || field.min} {field.unit}</span>
                                </div>
                            )}
                            {/* Reusing Config Logic Simplified for brevity */}
                            {field.type === 'chips' && (
                                <div className={styles.chips}>
                                    {field.options?.map(opt => (
                                        <button key={opt} className={`${styles.chip} ${val === opt ? styles.active : ""}`} onClick={() => updateField(field.key, opt)}>{opt}</button>
                                    ))}
                                </div>
                            )}
                            {field.type === 'toggle' && (
                                <div className={styles.toggleGroup}>
                                    {field.options?.map(opt => (
                                        <button key={opt} className={`${styles.toggle} ${val === opt ? styles.active : ""}`} onClick={() => updateField(field.key, opt)}>{opt}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}

            </div>

            <button className={styles.submitBtn} onClick={handleCreate} disabled={isSubmitting || !finalDateIso}>
                {isSubmitting ? "등록 중..." : "매칭 등록 (Post)"}
            </button>

            <style jsx>{`
                .active { background: #2563EB !important; color: white !important; border-color: #2563EB !important; }
                .subBtn { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #E5E7EB; background: white; font-weight: bold; }
                .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
                .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
                .dateBtn { padding: 12px 0; border-radius: 8px; border: 1px solid #E5E7EB; background: white; font-size: 0.9rem; font-weight: 500; }
                .slotBtn { padding: 12px; border-radius: 10px; border: 1px solid #E5E7EB; background: white; font-weight: 500; }
                .hourBtn { padding: 8px 16px; border-radius: 20px; border: 1px solid #E5E7EB; background: white; white-space: nowrap; }
                .locBtn { padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-radius: 12px; border: 1px solid #E5E7EB; background: white; font-size: 0.9rem; font-weight: bold; }
                .chip { padding: 8px 12px; border-radius: 20px; border: 1px solid #E5E7EB; background: white; margin-right: 8px; margin-bottom: 8px; }
                .toggleGroup { display: flex; gap: 8px; }
                .toggle { padding: 8px 16px; border-radius: 8px; border: 1px solid #E5E7EB; background: white; }
                .tagsGrid { display: flex; flex-wrap: wrap; gap: 8px; }
                .tagBtn { padding: 6px 12px; border-radius: 6px; border: 1px solid #E5E7EB; background: white; font-size: 0.85rem; }
            `}</style>
        </main>
    );
}
