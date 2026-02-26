"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import styles from './edit-form.module.css';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/canvasUtils';

import { SPORTS } from "@/constants/sports";

// Sport ID Map for display
const SPORT_NAMES: { [key: string]: string } = {
    soccer: '축구/풋살',
    boxing: '복싱',
    basketball: '농구',
    baseball: '야구',
    racket: '배드민턴/테니스',
    kickboxing: '킥복싱/MMA',
    judo: '유도/주짓수',
    health: '헬스',
};

export default function SportEditPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = createClient();
    const router = useRouter();

    // Unwrap params using React.use()
    const { id } = React.use(params);
    const sportId = id;

    // Find sport meta
    const sportMeta = SPORTS.find(s => s.id === sportId.toUpperCase());
    const sportName = sportMeta?.name || SPORT_NAMES[sportId] || sportId.toUpperCase();
    const sportIcon = sportMeta?.icon || '🏅';

    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Common Profile Fields
    const [nickname, setNickname] = useState("");
    const [region, setRegion] = useState("");

    const [skills, setSkills] = useState<any>({});

    // Dynamic Career Array
    const [careerList, setCareerList] = useState<{ type: string; name: string; year: string }[]>([]);

    // Captain Fields
    const [isCaptain, setIsCaptain] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [teamDesc, setTeamDesc] = useState("");
    const [emblemUrl, setEmblemUrl] = useState<string | null>(null);
    const [teamId, setTeamId] = useState<string | null>(null);

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [uploadType, setUploadType] = useState<'avatar' | 'emblem'>('avatar');

    // Refs
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const emblemInputRef = useRef<HTMLInputElement>(null);

    // Avatar State
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Fetch User & Existing Data on Mount
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            setUserId(user.id);

            // 1. Fetch Existing Player Data
            const { data: playerData } = await (supabase
                .from('players' as any) as any)
                .select('*')
                .eq('user_id', user.id)
                .eq('sport_type', sportId)
                .single();

            if (playerData) {
                setNickname(playerData.name);
                setRegion(playerData.location);

                // Load base skills
                const loadedSkills = playerData.skills || {};

                // [Refactor] Load from Columns if available (Normalization)
                if (playerData.weight_class) {
                    // Strip 'kg' or non-digits for number input compatibility
                    loadedSkills.weightClass = playerData.weight_class.toString().replace(/[^0-9.]/g, '');
                }

                // Map 'position' column based on sport
                if (playerData.position) {
                    if (['boxing', 'kickboxing', 'judo'].includes(sportId)) {
                        loadedSkills.stance = playerData.position; // Boxing Stance
                    } else {
                        loadedSkills.position = playerData.position; // Soccer Position
                    }
                }

                // Map new columns (foot, level) - Priority: Column > JSON > Empty
                if (playerData.main_foot) loadedSkills.foot = playerData.main_foot;
                if (playerData.skill_level) loadedSkills.level = playerData.skill_level;

                // [Refactor] Load Record Columns (wins, draws, losses) Priority over JSON/String
                if (playerData.wins !== null && playerData.wins !== undefined) loadedSkills.wins = playerData.wins;
                if (playerData.draws !== null && playerData.draws !== undefined) loadedSkills.draws = playerData.draws;
                if (playerData.losses !== null && playerData.losses !== undefined) loadedSkills.losses = playerData.losses;

                // Parse legacy Record "X전 Y승 Z패" if columns are empty (Migration fallback)
                if (playerData.record && !loadedSkills.wins && !loadedSkills.losses) {
                    const winsMatch = playerData.record.match(/(\d+)승/);
                    const lossesMatch = playerData.record.match(/(\d+)패/);
                    if (winsMatch) loadedSkills.wins = winsMatch[1];
                    if (lossesMatch) loadedSkills.losses = lossesMatch[1];
                }

                if (playerData.description) loadedSkills.description = playerData.description;
                if (playerData.short_intro) loadedSkills.short_intro = playerData.short_intro;
                if (playerData.birth_year) loadedSkills.birth_year = playerData.birth_year;
                if (playerData.height) loadedSkills.height = playerData.height;
                if (playerData.reach) loadedSkills.reach = playerData.reach;

                // Fetch direct description column
                if (playerData.description !== undefined) loadedSkills.real_description = playerData.description;

                // Parse Career History JSONB
                if (playerData.career_history) {
                    try {
                        let parsedCareers = typeof playerData.career_history === 'string' ? JSON.parse(playerData.career_history) : playerData.career_history;
                        if (Array.isArray(parsedCareers)) {
                            setCareerList(parsedCareers);
                        }
                    } catch (e) {
                        console.error("Failed to parse career_history JSON", e);
                    }
                }

                setSkills(loadedSkills);
                setAvatarUrl(playerData.avatar_url);

                // 2. Fetch Existing Team Data (using player_id, independent of boolean flags)
                const { data: teamData } = await (supabase
                    .from('teams' as any) as any)
                    .select('*')
                    .eq('captain_id', playerData.id) // Use Player ID, not User ID
                    .eq('sport_type', sportId)
                    .single();

                if (teamData) {
                    setIsCaptain(true);
                    setTeamName(teamData.team_name);
                    setTeamDesc(teamData.description || "");
                    setEmblemUrl(teamData.emblem_url);
                    setTeamId(teamData.id);
                } else {
                    setIsCaptain(false); // Explicitly unchecked if not captain
                }
            }
        };
        init();
    }, [sportId]);

    // ... (renderSportFields remains same as it binds to 'skills' state) ...
    // Note: renderSportFields uses 'skills.position' for soccer but 'skills.stance' for boxing?
    // Checking renderSportFields:
    // Soccer uses 'position'. Boxing uses 'stance'.
    // My init logic: `if (playerData.position) loadedSkills.stance = playerData.position;`
    // Wait, if it's Soccer, I should map `position` -> `skills.position`.
    // If it's Boxing, I should map `position` -> `skills.stance`.
    // The previous code had:
    // Soccer: value={skills.position} updateSkill('position', ...)
    // Boxing: value={skills.stance} updateSkill('stance', ...)
    // So I need a conditional map or map to both?
    // Since 'position' column is used for 'Stance' in boxing (Orthodox/Southpaw) and 'Position' in Soccer (FW/DF),
    // I should map it based on sportId.

    // Actually, let's refine the init logic inside the replacements to be sport-aware or just map to both if harmless.
    // Better to be specific.

    // Also handleSubmit needs to be updated. I will do that in the same tool call if possible, or separate?
    // The previous prompt said "Replace the entire fetch and update logic".
    // I will look for where handleSubmit starts. Line 257.
    // I'll replace from line 79 to line 272 (covers init and start of handleSubmit's update).
    // Wait, that's a huge block.
    // I'll do `init` replacement first.

    // Let's perform `init` replacement first.


    // --- Dynamic Field Renders ---


    // --- Image Handling ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'emblem') => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadType(type);
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result?.toString() || null);
                setIsCropModalOpen(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!blob) return;

            // Upload
            const fileName = `${uploadType}_${userId}_${sportId}_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

            if (uploadType === 'avatar') {
                setAvatarUrl(publicUrl);
            } else {
                setEmblemUrl(publicUrl);
            }
            setIsCropModalOpen(false);
        } catch (error) {
            alert("이미지 업로드 실패");
        }
    };

    // --- Submit Logic (UPDATE) ---
    const handleSubmit = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            // Prepare Data
            const wins = parseInt(skills.wins || '0', 10);
            const losses = parseInt(skills.losses || '0', 10);
            const draws = parseInt(skills.draws || '0', 10); // 복싱 등 무승부가 없는 종목은 0, 추후 확장을 위함
            const total = wins + draws + losses;
            const recordStr = (wins > 0 || draws > 0 || losses > 0) ? `${total}전 ${wins}승 ${draws > 0 ? draws + '무 ' : ''}${losses}패` : null;

            // Mapping for Position/Stance
            let positionVal = null;
            if (['boxing', 'kickboxing', 'judo'].includes(sportId)) {
                positionVal = skills.stance;
            } else if (sportId === 'soccer') {
                positionVal = skills.position;
            }
            // Add other sports if needed

            // Clean skills (Remove migrated fields if desired, or keep for safety? User said "skills: {} or misc")
            // To be safe and compliant:
            const { weightClass, stance, wins: _w, losses: _l, position: _p, foot, level, real_description: _rd, short_intro: _si, birth_year: _by, height: _h, reach: _r, career_history: _ch, ...restSkills } = skills;
            // Actually, keep other fields. 

            // 1. Update Player Profile
            const { data: updatedPlayer, error: playerError } = await (supabase.from('players' as any) as any)
                .update({
                    name: nickname,
                    location: region,
                    description: skills.real_description || null,
                    short_intro: skills.short_intro || null,
                    birth_year: skills.birth_year ? parseInt(skills.birth_year, 10) : null,
                    height: skills.height ? parseInt(skills.height, 10) : null,
                    reach: skills.reach ? parseInt(skills.reach, 10) : null,
                    career_history: careerList.length > 0 ? careerList : null,
                    // [Refactor] Migrated Columns
                    weight_class: skills.weightClass ? skills.weightClass.toString().replace(/[^0-9.]/g, '') : null,
                    position: positionVal,
                    record: recordStr,
                    wins: wins,
                    draws: draws,
                    losses: losses,
                    main_foot: foot,       // Mapped from skills.foot
                    skill_level: level,    // Mapped from skills.level

                    // Remaining skills
                    skills: restSkills, // Squeaky clean? Or just pass 'skills'? User said "skills is empty or misc".
                    // I'll pass 'restSkills' which strips the migrated ones to satisfy "normalization".
                    avatar_url: avatarUrl
                })
                .eq('user_id', userId)
                .eq('sport_type', sportId)
                .select().single();

            if (playerError) throw playerError;

            // 2. Update/Insert/Delete Team
            if (isCaptain) {
                if (!teamName) throw new Error("팀 이름을 입력해주세요.");

                if (teamId) {
                    // Update Existing Team
                    const { error: teamError } = await supabase.from('teams')
                        .update({
                            team_name: teamName,
                            description: teamDesc,
                            emblem_url: emblemUrl
                        })
                        .eq('id', teamId);
                    if (teamError) throw teamError;
                } else {
                    // Start New Team (Upgraded to Captain)
                    if (!updatedPlayer) throw new Error("선수 정보를 찾을 수 없습니다.");

                    const { data: newTeam, error: teamError } = await supabase.from('teams').insert({
                        captain_id: updatedPlayer.id,
                        sport_type: sportId,
                        team_name: teamName,
                        description: teamDesc,
                        emblem_url: emblemUrl
                    }).select().single();

                    if (teamError) throw teamError;

                    // [Auto-Assign] Update player's team_id
                    if (newTeam) {
                        // 1. [New System] Add to team_members
                        const { error: memberError } = await supabase.from('team_members').insert({
                            team_id: newTeam.id,
                            player_id: updatedPlayer.id,
                            role: 'LEADER'
                        });

                        if (memberError) console.error("Failed to add to team_members:", memberError);

                        // 2. [Legacy] Update player's team_id
                        const { error: assignError } = await supabase.from('players')
                            .update({ team_id: newTeam.id })
                            .eq('user_id', userId)
                            .eq('sport_type', sportId);

                        if (assignError) {
                            console.error("Failed to auto-assign team to player:", assignError);
                            alert("팀은 생성되었으나 소속 설정에 실패했습니다.");
                        }
                    }

                    // Update Profile Roles
                    const { data: profile } = await supabase.from('profiles').select('roles').eq('id', userId).single();
                    // Fix: Cast 'roles' (Json) to any/object to satisfy "Spread types may only be created from object types"
                    const newRoles = { ...((profile?.roles || {}) as any), [sportId]: 'captain' };
                    await supabase.from('profiles').update({ roles: newRoles }).eq('id', userId);
                }
            }

            alert("프로필 수정이 완료되었습니다!");
            router.refresh();
            router.back();

        } catch (error: any) {
            console.error(error);
            alert("수정 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.topHeader}>
                <h1 className={styles.pageTitle}>
                    <span style={{ marginRight: '0.5rem' }}>{sportIcon}</span>
                    {sportName} 프로필 수정
                </h1>
            </div>

            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.avatarUploadSection}>
                        <div className={styles.avatarPreview} onClick={() => avatarInputRef.current?.click()}>
                            {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>👤</span>}
                        </div>
                        <div className={styles.avatarUploadOverlay} onClick={() => avatarInputRef.current?.click()}>📷</div>
                    </div>
                    <input type="file" hidden ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" />

                    <div className={styles.teamInfo}>
                        <div className={styles.nameInputWrapper}>
                            <input
                                type="text"
                                className={styles.nameInput}
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="활동 닉네임 입력"
                            />
                            <span style={{ fontSize: '1rem', color: '#9CA3AF' }}>✏️</span>
                        </div>
                        {!['soccer', 'futsal'].includes(sportId) && (
                            <div className={styles.metaInfo} style={{ marginBottom: '0.5rem' }}>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>전적: 🥊</span>
                                    <input type="number" className={styles.recordInput} value={skills.wins || ""} onChange={(e) => setSkills((p: any) => ({ ...p, wins: e.target.value }))} placeholder="승" /> 승
                                    <input type="number" className={styles.recordInput} style={{ marginLeft: '4px' }} value={skills.losses || ""} onChange={(e) => setSkills((p: any) => ({ ...p, losses: e.target.value }))} placeholder="패" /> 패
                                </div>
                            </div>
                        )}

                        <input
                            type="text"
                            className={styles.specInput}
                            style={{ textAlign: 'left', width: '100%', fontSize: '1rem', color: '#111827', fontWeight: 600, margin: 0, padding: '0.2rem 0', marginTop: '0.5rem' }}
                            value={skills.short_intro || ""}
                            onChange={(e) => setSkills((p: any) => ({ ...p, short_intro: e.target.value }))}
                            placeholder="한줄 소개 (예: 멈추지 않는 아웃복서)"
                        />
                    </div>
                </div>
            </header>

            <section className={styles.section}>
                <h3 className={styles.subTitle}>개인 스펙</h3>
                <div className={styles.specList}>
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>출생</span>
                        <input
                            type="number"
                            className={styles.specInput}
                            value={skills.birth_year || ""}
                            onChange={(e) => setSkills((p: any) => ({ ...p, birth_year: e.target.value }))}
                            placeholder="1990 (입력)"
                        />
                    </div>
                    {!['soccer', 'futsal'].includes(sportId) && (
                        <div className={styles.specRow}>
                            <span className={styles.specRowLabel}>체급</span>
                            <input
                                type="number"
                                className={styles.specInput}
                                style={{ paddingRight: '2px' }}
                                value={skills.weightClass || ""}
                                onChange={(e) => setSkills((p: any) => ({ ...p, weightClass: e.target.value }))}
                                placeholder="65"
                            />
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, marginLeft: '2px', color: '#111827' }}>kg</span>
                        </div>
                    )}
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>신장</span>
                        <input
                            type="number"
                            className={styles.specInput}
                            style={{ paddingRight: '2px' }}
                            value={skills.height || ""}
                            onChange={(e) => setSkills((p: any) => ({ ...p, height: e.target.value }))}
                            placeholder="175"
                        />
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, marginLeft: '2px', color: '#111827' }}>cm</span>
                    </div>
                    {!['soccer', 'futsal'].includes(sportId) && (
                        <div className={styles.specRow}>
                            <span className={styles.specRowLabel}>리치</span>
                            <input
                                type="number"
                                className={styles.specInput}
                                style={{ paddingRight: '2px' }}
                                value={skills.reach || ""}
                                onChange={(e) => setSkills((p: any) => ({ ...p, reach: e.target.value }))}
                                placeholder="180"
                            />
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, marginLeft: '2px', color: '#111827' }}>cm</span>
                        </div>
                    )}
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>{['soccer', 'futsal'].includes(sportId) ? '포지션' : '스탠스'}</span>
                        <select
                            className={styles.specSelect}
                            value={['boxing', 'kickboxing', 'judo'].includes(sportId) ? (skills.stance || "") : (skills.position || "")}
                            onChange={(e) => setSkills((p: any) => ({ ...p, [['boxing', 'kickboxing', 'judo'].includes(sportId) ? 'stance' : 'position']: e.target.value }))}
                        >
                            <option value="">선택</option>
                            {['boxing', 'kickboxing', 'judo'].includes(sportId) ? (
                                <>
                                    <option value="Orthodox">오소독스</option>
                                    <option value="Southpaw">사우스포</option>
                                </>
                            ) : (
                                <>
                                    <option value="FW">공격수</option>
                                    <option value="MF">미드필더</option>
                                    <option value="DF">수비수</option>
                                    <option value="GK">골키퍼</option>
                                </>
                            )}
                        </select>
                    </div>
                    {['soccer', 'futsal'].includes(sportId) && (
                        <div className={styles.specRow}>
                            <span className={styles.specRowLabel}>주발</span>
                            <select
                                className={styles.specSelect}
                                value={skills.foot || ""}
                                onChange={(e) => setSkills((p: any) => ({ ...p, foot: e.target.value }))}
                            >
                                <option value="">선택</option>
                                <option value="Right">오른발</option>
                                <option value="Left">왼발</option>
                                <option value="Both">양발</option>
                            </select>
                        </div>
                    )}
                    <div className={styles.specRow}>
                        <span className={styles.specRowLabel}>주 활동지</span>
                        <input
                            type="text"
                            className={styles.specInput}
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            placeholder="서울시 강남구"
                        />
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h3 className={styles.subTitle}>경력 사항</h3>
                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #D1D5DB' }}>
                    {careerList.map((career, index) => (
                        <div key={index} className={styles.careerRow}>
                            <select
                                className={styles.careerSelect}
                                value={career.type}
                                onChange={(e) => {
                                    const newList = [...careerList];
                                    newList[index].type = e.target.value;
                                    setCareerList(newList);
                                }}
                            >
                                <option value="award">🏅 입상/대회</option>
                                <option value="edu">🎓 학력/자격</option>
                                <option value="job">💼 전/현직</option>
                                <option value="other">📌 기타</option>
                            </select>

                            <input
                                type="text"
                                className={styles.careerInput}
                                value={career.name}
                                onChange={(e) => {
                                    const newList = [...careerList];
                                    newList[index].name = e.target.value;
                                    setCareerList(newList);
                                }}
                                placeholder="대회명/자격증명"
                            />

                            <input
                                type="text"
                                maxLength={4}
                                className={styles.careerYearInput}
                                value={career.year}
                                onChange={(e) => {
                                    const newList = [...careerList];
                                    newList[index].year = e.target.value.replace(/[^0-9]/g, '');
                                    setCareerList(newList);
                                }}
                                placeholder="YYYY"
                            />

                            <button
                                className={styles.careerDeleteBtn}
                                onClick={() => {
                                    const newList = careerList.filter((_, i) => i !== index);
                                    setCareerList(newList);
                                }}
                            >
                                ❌
                            </button>
                        </div>
                    ))}

                    <button
                        className={styles.addCareerBtn}
                        onClick={() => setCareerList([...careerList, { type: 'award', name: '', year: '' }])}
                    >
                        + 경력 추가
                    </button>
                </div>
            </section>

            <section className={styles.section}>
                <h3 className={styles.subTitle}>상세 소개</h3>
                <textarea
                    className={styles.specInput}
                    style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '12px 16px',
                        fontSize: '1rem',
                        resize: 'vertical',
                        lineHeight: '1.5',
                        borderRadius: '0.75rem',
                        border: '1px solid #D1D5DB',
                        textAlign: 'left',
                        verticalAlign: 'top'
                    }}
                    value={skills.real_description || ""}
                    onChange={(e) => setSkills((p: any) => ({ ...p, real_description: e.target.value }))}
                    placeholder="본인에 대해 자유롭게 소개해주세요! (스타일, 좋아하는 것 등)"
                />
            </section>

            <section className={styles.section}>
                <div className={styles.captainToggle} onClick={() => setIsCaptain(!isCaptain)}>
                    <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isCaptain}
                        readOnly
                    />
                    <span className={styles.toggleLabel}>👑 이 종목의 캡틴(팀/관장)입니다</span>
                </div>

                {isCaptain && (
                    <div className={styles.expandedForm}>
                        <div className={styles.emblemUpload}>
                            <div className={styles.emblemPreview} onClick={() => emblemInputRef.current?.click()}>
                                {emblemUrl ? <img src={emblemUrl} alt="Emblem" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>🛡️</span>}
                            </div>
                            <button className={styles.uploadButton} onClick={() => emblemInputRef.current?.click()}>엠블럼 등록</button>
                            <input type="file" hidden ref={emblemInputRef} onChange={(e) => handleFileChange(e, 'emblem')} accept="image/*" />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>팀/체육관 이름</label>
                            <input type="text" className={styles.input} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="멋진 팀 이름을 지어주세요" />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>한줄 소개</label>
                            <input type="text" className={styles.input} value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="팀을 간단히 소개해주세요" />
                        </div>
                    </div>
                )}
            </section>

            <div className={styles.stickyBottomArea}>
                <button className={styles.submitButton} onClick={handleSubmit} disabled={loading}>
                    {loading ? '저장 중...' : '확인(수정 완료)'}
                </button>
            </div>

            {/* Crop Modal Reuse */}
            {isCropModalOpen && imageSrc && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'black', zIndex: 2000,
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ position: 'relative', flex: 1, backgroundColor: '#333' }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={(area, pixels) => setCroppedAreaPixels(pixels)}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'white', display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setIsCropModalOpen(false)} style={{ flex: 1, padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>취소</button>
                        <button onClick={handleCropSave} style={{ flex: 1, padding: '1rem', background: '#2563EB', color: 'white', borderRadius: '0.5rem' }}>저장</button>
                    </div>
                </div>
            )}
        </main>
    );
}
