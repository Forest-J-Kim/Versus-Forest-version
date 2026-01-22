"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sportConfig } from "@/lib/sportConfig";
import styles from "./wizard.module.css";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";

function MatchRegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const supabase = createClient();

    const mode = searchParams.get("mode") || "SOLO";
    const sportId = searchParams.get("sport") || "BOXING";
    const sportDef = sportConfig[mode]?.[sportId];

    // Generic State
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Independent Date State ---
    const [dateStep, setDateStep] = useState<"DATE" | "WEEKEND_DETAIL">("DATE");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // --- Independent Time State ---
    const [timeSlot, setTimeSlot] = useState<"AM" | "PM" | "EVE" | null>(null);
    const [selectedHour, setSelectedHour] = useState<number | null>(null);

    // --- User State ---
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            console.log("Current User Info (Mount):", user);
            setUser(user);
        };
        fetchUser();
    }, []);

    // --- Location State ---
    const [locationType, setLocationType] = useState<"HOME" | "AWAY" | "TBD">("HOME");

    // Hardcoded ID per request
    const TEMP_USER_ID = 'user-1234';

    if (!sportDef) {
        return <div className={styles.container}>Invalid Sport Configuration</div>;
    }

    // --- Logic for Date ---
    const handleDateMain = (choice: "TODAY" | "TOMORROW" | "WEEKEND") => {
        const now = new Date();
        if (choice === "TODAY") {
            const today = new Date();
            setSelectedDate(today);
            setDateStep("DATE");
        } else if (choice === "TOMORROW") {
            const tmr = new Date(now);
            tmr.setDate(tmr.getDate() + 1);
            setSelectedDate(tmr);
            setDateStep("DATE");
        } else if (choice === "WEEKEND") {
            setDateStep("WEEKEND_DETAIL");
        }
    };

    const handleWeekendPick = (day: "SAT" | "SUN") => {
        const d = new Date();
        const currentDay = d.getDay();
        let addDays = 0;
        if (day === "SAT") addDays = (6 - currentDay + 7) % 7;
        if (day === "SUN") addDays = (0 - currentDay + 7) % 7;
        if (addDays === 0 && d.getHours() > 20) addDays = 7;
        d.setDate(d.getDate() + addDays);
        setSelectedDate(d);
        // Optional: Reset to main view or keep detail? 
        // Keeping it simple as user wants persistent view usually, but let's stick to simple selection.
    };

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        setSelectedDate(new Date(e.target.value));
        setDateStep("DATE");
    };

    // --- Logic for Time ---
    const handleTimeSlot = (slot: "AM" | "PM" | "EVE") => {
        setTimeSlot(slot);
        setSelectedHour(null); // Reset hour if slot changes
    };

    const handleHourPick = (hour: number) => {
        setSelectedHour(hour);
    };

    const getHoursForSlot = () => {
        if (timeSlot === "AM") return [9, 10, 11, 12];
        if (timeSlot === "PM") return [13, 14, 15, 16, 17];
        if (timeSlot === "EVE") return [18, 19, 20, 21, 22];
        return [];
    };

    // --- Create Match ---
    const handleCreate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // 1. Auth Check (Robust Session)
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;

        if (!currentUser) {
            console.error("세션 없음");
            alert("로그인 세션을 찾을 수 없습니다. 다시 로그인해주세요.");
            return;
        }

        // 2. Validation
        if (!selectedDate && !timeSlot) {
            alert("최소한 날짜나 시간대는 선택해주세요.");
            return;
        }

        // 3. Date Construction
        // Logic: Combine date + hour if available, else default/now.
        // If critical parts missing, ask confirmation.
        if (!selectedDate || selectedHour === null) {
            if (!confirm("날짜 또는 정확한 시간이 선택되지 않았습니다. 현재 설정된 값(혹은 현재 시간)으로 등록하시겠습니까?")) {
                return;
            }
        }

        let finalTargetDate = new Date();
        if (selectedDate) {
            finalTargetDate = new Date(selectedDate);
            finalTargetDate.setHours(0, 0, 0, 0); // Reset time
            if (selectedHour !== null) {
                finalTargetDate.setHours(selectedHour, 0, 0, 0);
            }
        }
        // If no selectedDate, finalTargetDate stays as 'now'

        console.log("🔥 handleCreate triggered");

        try {
            setIsSubmitting(true);

            let locString = "장소 미정";
            if (locationType === "HOME") locString = "서울 복싱 (Home)";
            if (locationType === "AWAY") locString = "상대 체육관 희망 (Away)";
            if (locationType === "TBD") locString = "장소 협의";

            const matchData = {
                hostUserId: currentUser.id,
                date: finalTargetDate.toISOString(),
                location: locString,
                sport: sportId,
                mode: mode,
                status: 'OPEN',
                type: 'MATCH',
                attributes: JSON.stringify(formData)
            };

            console.log("📦 Sending Payload:", matchData);

            const { data, error } = await supabase
                .from('matches')
                .insert([matchData])
                .select();

            if (error) throw error;

            console.log("✅ Success:", data);
            alert("✅ 매칭이 등록되었습니다!");
            router.push("/matches"); // Next.js routing

        } catch (err: any) {
            console.error(err);
            alert(`❌ 등록 실패: ${err.message}\n` +
                (err.hint ? `Hint: ${err.hint}\n` : '') +
                (err.details ? `Details: ${err.details}` : ''));
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // --- Derived Summary ---
    let summaryText = "일시를 선택해주세요";

    // Calculate Date Part
    const dateText = selectedDate
        ? selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
        : "날짜 미정";

    // Calculate Time Part
    let timeText = "시간 미정";
    if (selectedHour !== null) {
        timeText = `${selectedHour}:00`;
    } else if (timeSlot) {
        timeText = timeSlot === 'AM' ? '오전' : timeSlot === 'PM' ? '오후' : '저녁';
    }

    // Combine
    if (selectedDate || timeSlot) {
        summaryText = `${dateText} ${timeText}`;
    }

    const summaryDetails = sportDef.fields
        .filter(f => formData[f.key])
        .map(f => `${formData[f.key]}${f.unit || ''}`)
        .join(' · ');

    return (
        <main className={styles.container}>
            <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>{sportDef.icon} {sportDef.name}</h1>

            <div className={styles.form}>

                {/* --- Section 1: Date --- */}
                <div className={styles.section}>
                    <h3 style={{ marginBottom: '0.5rem' }}>날짜 (Date)</h3>
                    <div className={styles.grid4} style={{ marginBottom: '8px' }}>
                        <button className={`${styles.dateBtn} ${selectedDate?.getDate() === new Date().getDate() ? styles.active : ''}`} onClick={() => handleDateMain("TODAY")}>오늘</button>
                        <button className={`${styles.dateBtn} ${selectedDate?.getDate() === new Date().getDate() + 1 ? styles.active : ''}`} onClick={() => handleDateMain("TOMORROW")}>내일</button>
                        <button className={`${styles.dateBtn}`} onClick={() => handleDateMain("WEEKEND")}>주말</button>
                        <input type="date" className={styles.dateInput} onChange={handleDateInput} style={{ height: '100%', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0 8px' }} />
                    </div>

                    {dateStep === "WEEKEND_DETAIL" && (
                        <div className={styles.grid4} style={{ marginBottom: '8px' }}>
                            <div /> {/* Spacer */}
                            <div /> {/* Spacer */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className={`subBtn ${selectedDate?.getDay() === 6 ? 'active' : ''}`} style={{ padding: '8px 0', fontSize: '0.8rem' }} onClick={() => handleWeekendPick("SAT")}>토</button>
                                <button className={`subBtn ${selectedDate?.getDay() === 0 ? 'active' : ''}`} style={{ padding: '8px 0', fontSize: '0.8rem' }} onClick={() => handleWeekendPick("SUN")}>일</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Section 2: Time --- */}
                <div className={styles.section}>
                    <h3 style={{ marginBottom: '0.5rem' }}>시간대 (Time)</h3>
                    <div className={styles.grid3}>
                        <button className={`slotBtn ${timeSlot === 'AM' ? 'active' : ''}`} onClick={() => handleTimeSlot("AM")}>오전 (09-12)</button>
                        <button className={`slotBtn ${timeSlot === 'PM' ? 'active' : ''}`} onClick={() => handleTimeSlot("PM")}>오후 (13-17)</button>
                        <button className={`slotBtn ${timeSlot === 'EVE' ? 'active' : ''}`} onClick={() => handleTimeSlot("EVE")}>저녁 (18-22)</button>
                    </div>

                    {timeSlot && (
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {getHoursForSlot().map(h => (
                                    <button
                                        key={h}
                                        className={`hourBtn ${selectedHour === h ? 'active' : ''}`}
                                        onClick={() => handleHourPick(h)}
                                    >
                                        {h}:00
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- Section 3: Location --- */}
                <div className={styles.section}>
                    <h3 style={{ marginBottom: '0.5rem' }}>장소 (Location)</h3>
                    <div className={styles.grid3}>
                        <button className={`locBtn ${locationType === 'HOME' ? 'active' : ''}`} onClick={() => setLocationType("HOME")}>
                            <span>🏠 홈</span>
                            <span style={{ fontSize: '0.8em', fontWeight: '400', opacity: 0.9 }}>(와주세요)</span>
                        </button>
                        <button className={`locBtn ${locationType === 'AWAY' ? 'active' : ''}`} onClick={() => setLocationType("AWAY")}>
                            <span>✈️ 원정</span>
                            <span style={{ fontSize: '0.8em', fontWeight: '400', opacity: 0.9 }}>(갈게요)</span>
                        </button>
                        <button className={`locBtn ${locationType === 'TBD' ? 'active' : ''}`} onClick={() => setLocationType("TBD")}>
                            <span>🤝 장소 미정</span>
                            <span style={{ fontSize: '0.8em', fontWeight: '400', opacity: 0.9 }}>(협의해요)</span>
                        </button>
                    </div>### 🤖 [목록 조회 수정] 등록된 매칭 데이터 실시간 출력 지시서

                    **1. 대상 파일**
                    * `src/app/matches/page.tsx` (매칭 목록 페이지)

                    **2. 데이터 페칭(Fetching) 로직 수정**
                    * **클라이언트 교체:** 기존 `supabaseClient` 대신 `import {createClient} from "@/utils/supabase/client";`를 사용하여 브라우저 세션과 연동하라.
                    * **쿼리 수정:** `supabase.from('matches').select('*')` 호출 시, 우리가 새로 만든 컬럼들(`date`, `sport`, `location`, `hostUserId`, `attributes`)을 모두 가져오는지 확인하라.
                    * **필터링 점검:**
                    * 현재 페이지가 '복싱' 종목이라면 `eq('sport', 'BOXING')` 또는 `eq('sport', 'soccer')` 처럼 등록 시 사용한 종목 ID와 일치하게 필터를 걸어라. (대소문자 주의)
                    * `status`가 'OPEN'인 데이터만 가져오도록 설정하라.

                    **3. UI 데이터 매핑 수정**
                    * 매칭 카드를 그릴 때, 날짜는 `target_date`가 아닌 **`date`** 컬럼에서 가져오도록 수정하라.
                    * 장소는 **`location`** 컬럼 데이터를 사용하라.
                    * **속성(Attributes) 처리:** `attributes` 필드가 문자열(String)로 저장되어 있다면, `JSON.parse(match.attributes)`를 통해 객체로 변환하여 체급, 강도 등을 카드에 표시하라.

                    **4. 실시간 갱신(Refresh)**
                    * `swr`을 사용 중이라면 `revalidateOnFocus` 옵션을 켜거나, 페이지 진입 시 최신 데이터를 가져오도록 `mutate`를 호출하라.

                    **5. 결과 확인**
                    * "등록된 매칭이 없습니다" 메시지 대신, 방금 등록한 매칭 카드가 화면에 나타나야 함.
                </div>

                {/* --- Dynamic Fields --- */}
                {sportDef.fields.map((field) => {
                    const val = formData[field.key];
                    return (
                        <div key={field.key} className={styles.section}>
                            <h3 style={{ marginBottom: '0.5rem' }}>{field.label}</h3>
                            {field.type === 'slider' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="range" min={field.min} max={field.max} value={Number(val) || field.min} onChange={(e) => updateField(field.key, Number(e.target.value))} style={{ flex: 1 }} />
                                    <span>{String(val || field.min)} {field.unit}</span>
                                </div>
                            )}
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

            {/* --- Summary --- */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '4px' }}>SUMMARY</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: (selectedDate || timeSlot) ? '#111827' : '#9CA3AF' }}>
                            {summaryText}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#374151', marginTop: '4px' }}>
                            {locationType === 'HOME' ? '🏠 내 체육관 (Home)' : locationType === 'AWAY' ? '✈️ 원정 (Away)' : '🤝 장소 협의'}
                        </div>
                    </div>
                </div>

                {summaryDetails && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', fontSize: '0.85rem', color: '#4B5563' }}>
                        {summaryDetails}
                    </div>
                )}
            </div>

            <button className={styles.submitBtn} onClick={handleCreate} disabled={isSubmitting || (!selectedDate && !timeSlot)}>
                {isSubmitting ? "등록 중..." : "매칭 등록"}
            </button>

            <style jsx>{`
                .active { background: #2563EB !important; color: white !important; border-color: #2563EB !important; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
                .subBtn { flex: 1; padding: 8px 12px; border-radius: 12px; border: 1px solid #E5E7EB; background: white; font-weight: 500; font-size: 0.85rem; color: #374151; transition: all 0.2s; }
                .grid3 { display: flex; flex-wrap: wrap; gap: 8px; }
                .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
                .dateBtn { padding: 12px 0; border-radius: 12px; border: 1px solid #E5E7EB; background: white; font-size: 0.9rem; font-weight: 500; }
                .slotBtn { padding: 10px 16px; border-radius: 9999px; border: 1px solid #E5E7EB; background: white; font-weight: 600; font-size: 0.9rem; color: #374151; flex: 1; text-align: center; transition: all 0.2s; }
                .locBtn { padding: 8px 12px; border-radius: 9999px; border: 1px solid #E5E7EB; background: white; font-weight: 600; font-size: 0.9rem; color: #374151; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; transition: all 0.2s; flex: 1; height: auto; }
                .hourBtn { padding: 6px 14px; border-radius: 9999px; border: 1px solid #E5E7EB; background: white; white-space: nowrap; font-weight: 600; font-size: 0.8rem; color: #4B5563; transition: all 0.2s; }
                .chip { padding: 8px 16px; border-radius: 9999px; border: 1px solid #E5E7EB; background: white; margin-right: 8px; margin-bottom: 8px; font-weight: 600; font-size: 0.9rem; color: #374151; }
                .toggleGroup { display: flex; gap: 8px; }
                .toggle { padding: 8px 16px; border-radius: 9999px; border: 1px solid #E5E7EB; background: #F3F4F6; font-weight: 500; color: #374151; }
                .tagsGrid { display: flex; flex-wrap: wrap; gap: 8px; }
                .tagBtn { padding: 6px 12px; border-radius: 6px; border: 1px solid #E5E7EB; background: white; font-size: 0.85rem; }
            `}</style>
        </main>
    );
}

export default function NewMatchWizard() {
    return (
        <Suspense fallback={<div className={styles.container}>Loading wizard...</div>}>
            <MatchRegisterForm />
        </Suspense>
    );
}
