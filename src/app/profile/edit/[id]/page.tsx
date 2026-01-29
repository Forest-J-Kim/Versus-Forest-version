"use client";

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

    // Dynamic Fields (JSON)
    const [skills, setSkills] = useState<any>({});

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

                // Parse Record "X전 Y승 Z패"
                if (playerData.record) {
                    const winsMatch = playerData.record.match(/(\d+)승/);
                    const lossesMatch = playerData.record.match(/(\d+)패/);
                    if (winsMatch) loadedSkills.wins = winsMatch[1];
                    if (lossesMatch) loadedSkills.losses = lossesMatch[1];
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
    const renderSportFields = () => {
        // Helper to update specific skill
        const updateSkill = (key: string, value: any) => {
            setSkills((prev: any) => ({ ...prev, [key]: value }));
        };

        switch (sportId) {
            case 'soccer':
                return (
                    <>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>포지션</label>
                            <select className={styles.select} value={skills.position || ""} onChange={(e) => updateSkill('position', e.target.value)}>
                                <option value="">선택하세요</option>
                                <option value="FW">공격수 (FW)</option>
                                <option value="MF">미드필더 (MF)</option>
                                <option value="DF">수비수 (DF)</option>
                                <option value="GK">골키퍼 (GK)</option>
                            </select>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>주발</label>
                            <select className={styles.select} value={skills.foot || ""} onChange={(e) => updateSkill('foot', e.target.value)}>
                                <option value="">선택하세요</option>
                                <option value="Right">오른발</option>
                                <option value="Left">왼발</option>
                                <option value="Both">양발</option>
                            </select>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>실력</label>
                            <select className={styles.select} value={skills.level || ""} onChange={(e) => updateSkill('level', e.target.value)}>
                                <option value="">선택하세요</option>
                                <option value="High">상 (선수출신)</option>
                                <option value="Mid">중 (동호회)</option>
                                <option value="Low">하 (초보)</option>
                            </select>
                        </div>
                    </>
                );
            case 'boxing':
            case 'kickboxing':
            case 'judo':
                return (
                    <>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>체급</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    className={styles.input}
                                    placeholder="예: 65"
                                    value={skills.weightClass || ""}
                                    onChange={(e) => updateSkill('weightClass', e.target.value)}
                                    style={{ paddingRight: '2.5rem' }}
                                />
                                <span style={{ position: 'absolute', right: '1rem', color: '#6B7280', fontSize: '0.9rem' }}>kg</span>
                            </div>
                        </div>
                        {(sportId === 'boxing' || sportId === 'kickboxing') && (
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>스탠스</label>
                                <select className={styles.select} value={skills.stance || ""} onChange={(e) => updateSkill('stance', e.target.value)}>
                                    <option value="">선택하세요</option>
                                    <option value="Orthodox">오소독스 (오른손잡이)</option>
                                    <option value="Southpaw">사우스포 (왼손잡이)</option>
                                </select>
                            </div>
                        )}
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>전적 (승/패)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="number" className={styles.input} placeholder="승" value={skills.wins || ""} onChange={(e) => updateSkill('wins', e.target.value)} />
                                <input type="number" className={styles.input} placeholder="패" value={skills.losses || ""} onChange={(e) => updateSkill('losses', e.target.value)} />
                            </div>
                        </div>
                    </>
                );
            case 'health':
                return (
                    <>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>3대 운동 중량 (Total)</label>
                            <input type="number" className={styles.input} placeholder="kg" value={skills.totalWeight || ""} onChange={(e) => updateSkill('totalWeight', e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>운동 스타일</label>
                            <select className={styles.select} value={skills.style || ""} onChange={(e) => updateSkill('style', e.target.value)}>
                                <option value="">선택하세요</option>
                                <option value="Bodybuilding">보디빌딩</option>
                                <option value="Powerlifting">파워리프팅</option>
                                <option value="Crossfit">크로스핏</option>
                                <option value="Diet">다이어트/건강</option>
                            </select>
                        </div>
                    </>
                );
            case 'racket':
                return (
                    <>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>구력 (년)</label>
                            <input type="number" className={styles.input} placeholder="년" value={skills.years || ""} onChange={(e) => updateSkill('years', e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>급수 (NTRP / A~D조)</label>
                            <input type="text" className={styles.input} placeholder="예: A조, NTRP 4.0" value={skills.level || ""} onChange={(e) => updateSkill('level', e.target.value)} />
                        </div>
                    </>
                );
            default:
                return <p style={{ color: '#999', fontSize: '0.9rem' }}>기본 정보만 입력합니다.</p>;
        }
    };

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
            const total = wins + losses;
            const recordStr = (wins > 0 || losses > 0) ? `${total}전 ${wins}승 ${losses}패` : null;

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
            const { weightClass, stance, wins: _w, losses: _l, position: _p, foot, level, ...restSkills } = skills;
            // Actually, keep other fields. 

            // 1. Update Player Profile
            const { data: updatedPlayer, error: playerError } = await (supabase.from('players' as any) as any)
                .update({
                    name: nickname,
                    location: region,
                    // [Refactor] Migrated Columns
                    weight_class: skills.weightClass ? skills.weightClass.toString().replace(/[^0-9.]/g, '') : null,
                    position: positionVal,
                    record: recordStr,
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
            router.push(`/profile`);

        } catch (error: any) {
            console.error(error);
            alert("수정 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.titleSection}>
                <h1 className={styles.title}>
                    <span style={{ marginRight: '0.5rem' }}>{sportIcon}</span>
                    {sportName} 프로필 수정
                </h1>
                <p className={styles.subtitle}>입력된 정보를 수정할 수 있습니다.</p>
            </div>

            <div className={styles.formSection}>
                <span className={styles.sectionLabel}>기본 정보</span>

                {/* Avatar Upload UI */}
                <div className={styles.avatarUploadSection}>
                    <div className={styles.avatarPreview} onClick={() => avatarInputRef.current?.click()}>
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>👤</span>}
                    </div>
                    <button className={styles.avatarUploadButton} onClick={() => avatarInputRef.current?.click()}>
                        {sportName} 프로필 사진 등록
                    </button>
                    <input type="file" hidden ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" />
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>활동 닉네임</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                </div>
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>주 활동 지역</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="예: 서울시 성동구"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.formSection}>
                <span className={styles.sectionLabel}>상세 정보 ({sportName})</span>
                {renderSportFields()}
            </div>

            <div className={`${styles.formSection} ${isCaptain ? styles.captainSection : ''}`}>
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
            </div>

            <button className={styles.submitButton} onClick={handleSubmit} disabled={loading}>
                {loading ? '저장 중...' : '수정 완료'}
            </button>

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
