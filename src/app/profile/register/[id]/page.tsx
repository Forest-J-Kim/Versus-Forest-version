"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import styles from './register-form.module.css';
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

export default function SportRegisterPage({ params }: { params: Promise<{ id: string }> }) {
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

    // Crop State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [uploadType, setUploadType] = useState<'avatar' | 'emblem'>('avatar'); // Track type

    // Uploaded URLs
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Refs
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const emblemInputRef = useRef<HTMLInputElement>(null);

    // Fetch User on Mount
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            setUserId(user.id);

            // Prefill nickname from profile
            const { data: profile } = await supabase.from('profiles').select('nickname, avatar_url').eq('id', user.id).single();
            if (profile?.nickname) setNickname(profile.nickname);
            // Optional: Prefill with main profile avatar if we want?
            // "so users can have different photos". Maybe default to main avatar if not set?
            // For now, let's start blank or use main avatar as default preview if logic allows.
            // But if user uploads new one, it overrides.
            // Let's just keep it blank for new register unless user wants to use main.
        };
        init();
    }, []);

    // --- Dynamic Field Renders ---
    const renderSportFields = () => {
        switch (sportId) {
            case 'soccer':
                return (
                    <>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>포지션</label>
                            <select className={styles.select} onChange={(e) => setSkills({ ...skills, position: e.target.value })}>
                                <option value="">선택하세요</option>
                                <option value="FW">공격수 (FW)</option>
                                <option value="MF">미드필더 (MF)</option>
                                <option value="DF">수비수 (DF)</option>
                                <option value="GK">골키퍼 (GK)</option>
                            </select>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>주발</label>
                            <select className={styles.select} onChange={(e) => setSkills({ ...skills, foot: e.target.value })}>
                                <option value="">선택하세요</option>
                                <option value="Right">오른발</option>
                                <option value="Left">왼발</option>
                                <option value="Both">양발</option>
                            </select>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>실력</label>
                            <select className={styles.select} onChange={(e) => setSkills({ ...skills, level: e.target.value })}>
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
                            <input type="text" className={styles.input} placeholder="예: -70kg, 헤비급" onChange={(e) => setSkills({ ...skills, weightClass: e.target.value })} />
                        </div>
                        {(sportId === 'boxing' || sportId === 'kickboxing') && (
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>스탠스</label>
                                <select className={styles.select} onChange={(e) => setSkills({ ...skills, stance: e.target.value })}>
                                    <option value="">선택하세요</option>
                                    <option value="Orthodox">오소독스 (오른손잡이)</option>
                                    <option value="Southpaw">사우스포 (왼손잡이)</option>
                                </select>
                            </div>
                        )}
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>전적 (승/패)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="number" className={styles.input} placeholder="승" onChange={(e) => setSkills({ ...skills, wins: e.target.value })} />
                                <input type="number" className={styles.input} placeholder="패" onChange={(e) => setSkills({ ...skills, losses: e.target.value })} />
                            </div>
                        </div>
                    </>
                );
            case 'health':
                return (
                    <>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>3대 운동 중량 (Total)</label>
                            <input type="number" className={styles.input} placeholder="kg" onChange={(e) => setSkills({ ...skills, totalWeight: e.target.value })} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>운동 스타일</label>
                            <select className={styles.select} onChange={(e) => setSkills({ ...skills, style: e.target.value })}>
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
                            <input type="number" className={styles.input} placeholder="년" onChange={(e) => setSkills({ ...skills, years: e.target.value })} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>급수 (NTRP / A~D조)</label>
                            <input type="text" className={styles.input} placeholder="예: A조, NTRP 4.0" onChange={(e) => setSkills({ ...skills, level: e.target.value })} />
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

    // --- Submit Logic ---
    const handleSubmit = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            // 1. Insert Player Profile
            const { error: playerError } = await supabase.from('players').insert({
                user_id: userId,
                sport_type: sportId,
                name: nickname,
                location: region,
                skills: skills,
                avatar_url: avatarUrl // Insert Avatar URL
            });
            if (playerError) throw playerError;

            // 2. Insert Team if Captain
            if (isCaptain) {
                if (!teamName) throw new Error("팀 이름을 입력해주세요.");

                const { error: teamError } = await supabase.from('teams').insert({
                    captain_id: userId,
                    sport_type: sportId,
                    team_name: teamName,
                    description: teamDesc,
                    emblem_url: emblemUrl
                });
                if (teamError) throw teamError;

                // Update Profile Roles
                const { data: profile } = await supabase.from('profiles').select('roles').eq('id', userId).single();
                const newRoles = { ...(profile?.roles || {}), [sportId]: 'captain' };
                await supabase.from('profiles').update({ roles: newRoles }).eq('id', userId);
            }

            alert("프로필 등록이 완료되었습니다!");
            router.push('/profile');

        } catch (error: any) {
            console.error(error);
            alert("등록 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.titleSection}>
                <h1 className={styles.title}>
                    <span style={{ marginRight: '0.5rem' }}>{sportIcon}</span>
                    {sportName} 프로필 등록
                </h1>
                <p className={styles.subtitle}>선수로서의 상세 정보를 입력해주세요.</p>
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
                    <span className={styles.toggleLabel}>👑 이 종목의 캡틴(팀/관장)으로 등록하시겠습니까?</span>
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
                {loading ? '저장 중...' : '등록 완료'}
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
