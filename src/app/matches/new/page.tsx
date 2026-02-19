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

    const getSimpleAddress = (fullAddress: string) => {
        if (!fullAddress) return "";
        const parts = fullAddress.split(' ');
        const regions = parts.filter(p =>
            p.endsWith('시') || p.endsWith('도') || p.endsWith('구') || p.endsWith('군')
        );
        return [...new Set(regions)].join(' ') || fullAddress;
    };

    const mode = searchParams.get("mode") || "SOLO";
    const sportId = searchParams.get("sport") || "BOXING";
    const sportDef = sportConfig[mode]?.[sportId];

    // Generic State
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // [New] Sport Type Logic
    const teamSports = ['SOCCER', 'FUTSAL', 'BASEBALL'];
    const isTeamSport = teamSports.includes(sportId.toUpperCase()) || mode === 'TEAM';

    // --- Independent Date State ---
    const [dateStep, setDateStep] = useState<"DATE" | "WEEKEND_DETAIL">("DATE");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // --- Independent Time State ---
    const [timeSlot, setTimeSlot] = useState<"AM" | "PM" | "EVE" | null>(null);
    const [selectedHour, setSelectedHour] = useState<number | null>(null);

    // --- User State ---
    const [user, setUser] = useState<any>(null);

    const [locationType, setLocationType] = useState<"HOME" | "AWAY" | "TBD">("HOME");
    const [matchLocation, setMatchLocation] = useState<string>("장소 미정");

    const [ownedTeams, setOwnedTeams] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    // --- Location Logic Effect ---
    useEffect(() => {
        const fetchTeams = async () => {
            if (!selectedPlayerId) {
                setOwnedTeams([]);
                return;
            }
            const { data } = await supabase
                .from('team_members')
                .select('team:teams(id, team_name, location)')
                .eq('player_id', selectedPlayerId);

            const teams = data?.map((d: any) => d.team) || [];
            setOwnedTeams(teams);

            // Auto-select first team if available and none selected
            // [Fix] Only auto-select if teamId is empty.
            if (teams.length > 0 && !selectedTeamId) {
                setSelectedTeamId(teams[0].id);
            }
        };
        fetchTeams();
    }, [selectedPlayerId]);

    // Update Match Location String
    useEffect(() => {
        if (locationType === 'HOME') {
            const team = ownedTeams.find(t => t.id === selectedTeamId);
            if (team) {
                const shortLoc = getSimpleAddress(team.location);
                // [UX] Different wording for Team Sport vs Individual
                const prefix = isTeamSport ? '🏟️' : '🏠';
                setMatchLocation(`${prefix} ${team.team_name} (${shortLoc})`);
            } else {
                setMatchLocation(isTeamSport ? "🏟️ 홈 구장 (팀/구장 선택 필요)" : "🏠 홈 (체육관 선택 필요)");
            }
        } else if (locationType === 'AWAY') {
            setMatchLocation(isTeamSport ? "✈️ 원정 경기 (Away)" : "상대 체육관 (Away)");
        } else {
            setMatchLocation("장소 협의");
        }
    }, [locationType, selectedTeamId, ownedTeams, isTeamSport]);

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                setIsLoading(true);

                // 1. 유저 인증
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setUser(user); // Save user

                // 2. 내 선수 프로필 조회
                const { data: me } = await (supabase
                    .from('players' as any) as any)
                    .select('id, name, avatar_url, weight_class, position, record, team_id')
                    .eq('user_id', user.id)
                    .eq('sport_type', sportId.toLowerCase()) // Ensure case match
                    .maybeSingle();

                if (!me) {
                    // Handle case where profile doesn't exist?
                    // For now just return, dropdown will show empty
                    return;
                }

                // [FIX] Manual Team Fetch for 'Me'
                if (me.team_id) {
                    const { data: myTeamData } = await supabase
                        .from('teams')
                        .select('team_name, location')
                        .eq('id', me.team_id)
                        .single();
                    if (myTeamData) {
                        me.team = myTeamData;
                    }
                }

                // Set default selection if empty
                setSelectedPlayerId(prev => prev || me.id);

                // 3. 캡틴 여부 확인
                const { data: myTeam } = await (supabase
                    .from('teams' as any) as any)
                    .select('id, team_name, location')
                    .eq('captain_id', me.id)
                    .eq('sport_type', sportId.toLowerCase())
                    .maybeSingle();

                let finalCandidates: any[] = [];

                if (myTeam) {
                    // [캡틴] 팀원들 조회
                    const { data: members } = await (supabase
                        .from('team_members' as any) as any)
                        .select('player_id')
                        .eq('team_id', myTeam.id);

                    if (members && members.length > 0) {
                        const ids = members.map((m: any) => m.player_id);

                        // 팀원 상세 정보
                        const { data: teamPlayers } = await (supabase
                            .from('players' as any) as any)
                            .select('id, name, avatar_url, weight_class, position, record')
                            .in('id', ids);

                        // Attach Team Info manually
                        const playersWithTeam = teamPlayers?.map((p: any) => ({
                            ...p,
                            team: { team_name: myTeam.team_name, location: myTeam.location }
                        })) || [];

                        finalCandidates = playersWithTeam;

                        // 나 자신이 포함 안 되어 있으면 추가
                        if (!finalCandidates.find((p: any) => p.id === me.id)) {
                            if (!me.team && me.team_id === myTeam.id) {
                                me.team = { team_name: myTeam.team_name, location: myTeam.location };
                            }
                            finalCandidates.push(me);
                        }
                    } else {
                        finalCandidates = [me];
                    }
                } else {
                    // [일반] 나만 표시
                    finalCandidates = [me];
                }

                setCandidates(finalCandidates);

            } catch (error) {
                console.error('선수 목록 로딩 실패:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCandidates();
    }, [sportId]); // Add dependency on sportId

    // Effect to auto-fill weight/position when player changes
    useEffect(() => {
        if (!selectedPlayerId) return;

        // Find player in candidates list or default to user
        let player: any = null;
        if (candidates.length > 0) {
            player = candidates.find(m => m.id === selectedPlayerId);
        } else if (user && user.id === selectedPlayerId) {
            // Solo fallback (if user data is available in state or could be looked up)
            player = user;
            if (!player.weightClass && player.user_metadata?.weightClass) {
                player = { ...player, weightClass: player.user_metadata.weightClass };
            }
        }

        if (player) {
            // Map DB columns to Form keys
            // 'weight_class' (DB from players table) -> 'weight' (Form/sportConfig)
            const wVal = player.weight_class;
            if (wVal) {
                const wStr = String(wVal);
                const w = parseInt(wStr.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(w)) {
                    updateField('weight', w);
                }
            }
        }
    }, [selectedPlayerId, candidates, user]);

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

        console.log("🔥 handleCreate triggered");

        try {
            setIsSubmitting(true);

            // Use the reactive state 'matchLocation' directly
            const locString = matchLocation;

            let homePlayerId: string | null = null;
            let homeTeamId: string | null = null;

            // Logic Branching (Team vs Individual)
            if (isTeamSport) {
                // Team Sport: Primary selection is Team
                homeTeamId = selectedTeamId;
                homePlayerId = selectedPlayerId; // The captain/author (current user in context)

                if (!homeTeamId) {
                    alert("팀을 선택해주세요.");
                    setIsSubmitting(false);
                    return;
                }
            } else {
                // Individual Sport: Primary selection is Player
                homePlayerId = selectedPlayerId;

                // Inherit Team ID if available (for location/badge)
                if (locationType === 'HOME') {
                    homeTeamId = selectedTeamId || null;
                }
            }

            // [Step 3] Data Saving (Insert)
            // Handle Uniform Logic
            let finalUniform = null;
            if (formData.uniform_selection === 'OTHER') {
                finalUniform = formData.uniform_custom || '기타'; // Default to '기타' if empty? Or allow null?
            } else if (formData.uniform_selection) {
                // Map Value to Label
                const colorMap: Record<string, string> = {
                    'WHITE': '흰색', 'BLACK': '검정', 'RED': '빨강',
                    'BLUE': '파랑', 'YELLOW': '노랑', 'NEON': '형광'
                };
                finalUniform = colorMap[formData.uniform_selection] || formData.uniform_selection;
            }

            // Cost Logic
            const costValue = formData.cost && !isNaN(Number(formData.cost)) ? Number(formData.cost) : 0;

            const matchData = {
                home_player_id: homePlayerId,
                home_team_id: homeTeamId,
                match_date: finalTargetDate.toISOString(),
                match_location: locString,
                sport_type: sportId,
                status: 'PENDING', // Uppercase, explicitly set to PENDING
                host_user_id: currentUser.id,
                type: 'MATCH',

                // [UPDATE] Refactored from attributes JSON to individual columns
                match_weight: Number(formData.weight),
                match_type: formData.type, // Sparring Intensity
                rounds: formData.rounds ? Number(String(formData.rounds).replace(/[^0-9]/g, '')) : null,
                gear: formData.gear,
                description: formData.description,
                tags: formData.tags,

                // [New] Team Sport Fields
                cost: costValue,
                uniform_color: finalUniform,
                match_gender: formData.match_gender || 'MALE',
                match_mode: locationType === 'TBD' ? 'NEUTRAL' : locationType, // 'HOME' | 'AWAY' | 'NEUTRAL'

                // [New] Revamped Logic Fields
                match_format: formData.format,
                has_pitch: formData.hasPitch,
                team_level: formData.level
            };

            console.log("📦 Sending Payload:", matchData);

            const { data, error } = await (supabase
                .from('matches' as any) as any)
                .insert([matchData])
                .select();

            if (error) throw error;

            console.log("✅ Success:", data);
            alert("✅ 매칭이 등록되었습니다!");
            router.refresh();
            router.back(); // Return to previous context (List)

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
            <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>{sportDef.icon} {sportDef.name} 매칭 등록</h1>

            <div className={styles.form}>

                {/* --- Section 0: Player/Team Selection --- */}
                <div className={styles.section}>
                    <h3 style={{ marginBottom: '0.5rem' }}>
                        {isTeamSport ? "팀 선택 (Team)" : "선수 선택 (Player)"}
                    </h3>

                    {isTeamSport ? (
                        <select
                            className={styles.inputSelect}
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB', backgroundColor: 'white' }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <option>팀 정보 불러오는 중...</option>
                            ) : ownedTeams.length === 0 ? (
                                <option>소속된 팀이 없습니다</option>
                            ) : (
                                ownedTeams.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.team_name}
                                    </option>
                                ))
                            )}
                        </select>
                    ) : (
                        <select
                            className={styles.inputSelect}
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB', backgroundColor: 'white' }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <option>선수 정보 불러오는 중...</option>
                            ) : candidates.length === 0 ? (
                                <option>등록된 선수 없음</option>
                            ) : (
                                candidates.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.weight_class ? `${p.weight_class}kg` : '체급미정'} / {p.position || '스탠스미정'})
                                    </option>
                                ))
                            )}
                        </select>
                    )}
                </div>

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
                            <span>{isTeamSport ? '🏟️ 홈 구장' : '🏠 홈'}</span>
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
                    </div>

                    {/* Google Maps Placeholder */}


                    {/* Team Selection Dropdown (Only for HOME & Individual Sports) */}
                    {/* For Team Sports, the top dropdown already selects the team, so we don't need this again unless we want to allow chaning venue? */}
                    {/* Requirement says: "For team mode, default to team.location". Since we select team at top, we just use it. */}
                    {/* So hide this for Team Sports to avoid confusion or redundancy, OR keep it if user wants to select a gym that ISN'T their team's? */}
                    {/* Assuming for simplicity that Team Sport Home = Team's Location. */}

                    {locationType === 'HOME' && !isTeamSport && (
                        <div style={{ marginTop: '12px' }}>
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: 'white',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="">(체육관을 선택해주세요)</option>
                                {ownedTeams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.team_name} ({getSimpleAddress(team.location)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* --- Dynamic Fields --- */}

                {/* [New] Team Sport Exclusive Fields */}
                {isTeamSport && (
                    <div className={styles.section}>
                        <h3 style={{ marginBottom: '1rem' }}>매치 상세 정보</h3>

                        {/* 1. 참가비 (Cost) */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className={styles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                                팀당 참가비 (원)
                            </label>
                            <input
                                type="text"
                                placeholder="0 (무료)"
                                className={styles.input}
                                value={formData.cost ? Number(formData.cost).toLocaleString('ko-KR') : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    updateField('cost', raw ? Number(raw) : 0);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        const current = Number(formData.cost || 0);
                                        updateField('cost', current + 1000);
                                    } else if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        const current = Number(formData.cost || 0);
                                        const next = current - 1000;
                                        updateField('cost', next < 0 ? 0 : next);
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '12px',
                                    borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '1rem'
                                }}
                            />
                            <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
                                * 0원 입력 시 '무료'로 표시됩니다.
                            </p>
                        </div>

                        {/* 2. 유니폼 색상 (Uniform Color) */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className={styles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                                홈 팀 유니폼 색상
                            </label>

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {[
                                    { label: '흰색', value: 'WHITE', hex: '#FFFFFF', border: true },
                                    { label: '검정', value: 'BLACK', hex: '#171717' },
                                    { label: '빨강', value: 'RED', hex: '#EF4444' },
                                    { label: '파랑', value: 'BLUE', hex: '#3B82F6' },
                                    { label: '노랑', value: 'YELLOW', hex: '#FACC15' },
                                    { label: '형광', value: 'NEON', hex: '#CCFF00' },
                                    { label: '기타', value: 'OTHER', hex: '#E5E7EB', text: '?' },
                                ].map((opt) => (
                                    <div key={opt.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <button
                                            onClick={() => updateField('uniform_selection', opt.value)}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '9999px',
                                                backgroundColor: opt.hex,
                                                border: opt.border ? '1px solid #D1D5DB' : '1px solid transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                boxShadow: formData.uniform_selection === opt.value
                                                    ? `0 0 0 2px white, 0 0 0 4px ${opt.hex === '#FFFFFF' ? '#9CA3AF' : opt.hex}`
                                                    : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                            title={opt.label}
                                        >
                                            {opt.text && (
                                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6B7280' }}>
                                                    {opt.text}
                                                </span>
                                            )}
                                            {formData.uniform_selection === opt.value && !opt.text && (
                                                <span style={{
                                                    color: opt.value === 'WHITE' || opt.value === 'NEON' || opt.value === 'YELLOW' ? '#000' : '#fff',
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ✓
                                                </span>
                                            )}
                                        </button>
                                        <span style={{ fontSize: '0.75rem', color: '#4B5563', fontWeight: formData.uniform_selection === opt.value ? '600' : '400' }}>
                                            {opt.label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {formData.uniform_selection === 'OTHER' && (
                                <input
                                    type="text"
                                    placeholder="색상 직접 입력 (예: 보라색, 줄무늬)"
                                    className={styles.input}
                                    value={formData.uniform_custom || ''}
                                    onChange={(e) => updateField('uniform_custom', e.target.value)}
                                    style={{
                                        marginTop: '12px',
                                        width: '100%', padding: '12px',
                                        borderRadius: '12px', border: '1px solid #E5E7EB',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            )}
                        </div>

                        {/* 3. 매치 성별 (Match Gender) */}
                        <div style={{ marginBottom: '0.5rem' }}>
                            <label className={styles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                                참여 가능 성별
                            </label>
                            <div className={styles.grid3}>
                                <button className={`slotBtn ${formData.match_gender === 'MALE' ? 'active' : ''}`} onClick={() => updateField('match_gender', 'MALE')}>남성</button>
                                <button className={`slotBtn ${formData.match_gender === 'FEMALE' ? 'active' : ''}`} onClick={() => updateField('match_gender', 'FEMALE')}>여성</button>
                                <button className={`slotBtn ${formData.match_gender === 'MIXED' ? 'active' : ''}`} onClick={() => updateField('match_gender', 'MIXED')}>혼성</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* [New] Team Sport: Format, Pitch, Level (Moved from Generic) */}
                {isTeamSport && (
                    <div className={styles.section}>
                        <h3 style={{ marginBottom: '1rem' }}>경기 정보</h3>

                        {/* 1. 경기 방식 (Format) */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className={styles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                                경기 방식
                            </label>
                            <div className={styles.chips}>
                                {(['5vs5', '6vs6', '11vs11']).map(opt => (
                                    <button
                                        key={opt}
                                        className={`${styles.chip} ${formData.format === opt ? styles.active : ""}`}
                                        onClick={() => updateField('format', opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. 구장 확보 여부 (Has Pitch) */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className={styles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                                구장 확보 여부
                            </label>
                            <div className={styles.grid3}>
                                <button
                                    className={`slotBtn ${formData.hasPitch === true ? 'active' : ''}`}
                                    onClick={() => updateField('hasPitch', true)}
                                >
                                    🏟️ 구장 확보함
                                </button>
                                <button
                                    className={`slotBtn ${formData.hasPitch === false ? 'active' : ''}`}
                                    onClick={() => updateField('hasPitch', false)}
                                >
                                    ✈️ 원정 경기 가능
                                </button>
                            </div>
                        </div>

                        {/* 3. 팀 수준 (Team Level - 5 Steps) */}
                        <div style={{ marginBottom: '0.5rem' }}>
                            <label className={styles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                                팀 수준 (실력)
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { lv: 1, label: '갓 태어난 병아리', icon: '🐣' },
                                    { lv: 2, label: '동네 에이스', icon: '🏃' },
                                    { lv: 3, label: '지역구 강자', icon: '🎖️' },
                                    { lv: 4, label: '전국구 고수', icon: '🏆' },
                                    { lv: 5, label: '우주 방위대', icon: '👽' },
                                ].map((item) => (
                                    <button
                                        key={item.lv}
                                        onClick={() => updateField('level', item.lv)}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            border: formData.level === item.lv ? '2px solid #2563EB' : '1px solid #E5E7EB',
                                            background: formData.level === item.lv ? '#EFF6FF' : 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>{item.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: formData.level === item.lv ? '#1D4ED8' : '#374151' }}>
                                                Lv.{item.lv} {item.label}
                                            </div>
                                        </div>
                                        {formData.level === item.lv && (
                                            <span style={{ marginLeft: 'auto', color: '#2563EB', fontWeight: 'bold' }}>✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {sportDef.fields.map((field) => {
                    // [Custom Logic] Skip fields that are handled manually for Team Sports
                    if (isTeamSport && ['format', 'location', 'level'].includes(field.key)) {
                        return null;
                    }

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
                            {field.type === 'tags' && (
                                <div>
                                    <div className={styles.tagsGrid}>
                                        {field.tags?.map(tag => (
                                            <button
                                                key={tag}
                                                className={`${styles.tagBtn} ${(formData.tags || []).includes(tag) ? styles.active : ""}`}
                                                onClick={() => {
                                                    const current = formData.tags || [];
                                                    const next = current.includes(tag)
                                                        ? current.filter((t: string) => t !== tag)
                                                        : [...current, tag];
                                                    updateField('tags', next);
                                                }}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '12px' }}>
                                        <textarea
                                            placeholder="매칭에 대한 상세 내용을 입력해주세요 (선택)"
                                            value={formData.description || ''}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            style={{
                                                width: '100%', minHeight: '80px', padding: '12px',
                                                borderRadius: '12px', border: '1px solid #E5E7EB',
                                                resize: 'none', fontSize: '0.9rem', outline: 'none'
                                            }}
                                        />
                                    </div>
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
                            <div style={{ fontSize: '0.9rem', color: '#374151', marginTop: '4px' }}>
                                {matchLocation}
                            </div>                        </div>
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
