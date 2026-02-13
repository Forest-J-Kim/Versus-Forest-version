"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import styles from './team-new.module.css';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/canvasUtils';
import GoogleLocationPicker from '@/components/common/GoogleLocationPicker';

interface TeamCreateClientProps {
    userId: string;
    playerId: string;
    sportId: string;
    sportName: string;
    sportIcon: React.ReactNode;
}

export default function TeamCreateClient({
    userId,
    playerId,
    sportId,
    sportName,
    sportIcon
}: TeamCreateClientProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const router = useRouter();

    const [submitting, setSubmitting] = useState(false);

    // Form Fields
    const [teamName, setTeamName] = useState("");
    const [teamDesc, setTeamDesc] = useState("");
    const [location, setLocation] = useState(""); // Stores address string
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [emblemUrl, setEmblemUrl] = useState<string | null>(null);

    // Image Upload
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const emblemInputRef = useRef<HTMLInputElement>(null);

    // Handle Location Selection
    const handleLocationSelect = (address: string, latitude: number, longitude: number) => {
        setLocation(address);
        setLat(latitude);
        setLng(longitude);
    };

    // Image Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result?.toString() || null);
                setIsCropModalOpen(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels || !userId || !sportId) return;
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!blob) return;

            const fileName = `emblem_${userId}_${sportId}_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('emblems').upload(fileName, blob, { upsert: true });

            // If bucket doesn't exist or error, try 'avatars' as fallback or handle error
            if (uploadError) {
                // Try avatars bucket if emblems fails (just in case)
                const { error: retryError } = await supabase.storage.from('avatars').upload(fileName, blob, { upsert: true });
                if (retryError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
                setEmblemUrl(publicUrl);
            } else {
                const { data: { publicUrl } } = supabase.storage.from('emblems').getPublicUrl(fileName);
                setEmblemUrl(publicUrl);
            }

            setIsCropModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("이미지 업로드 실패");
        }
    };

    const handleSubmit = async () => {
        if (!teamName.trim()) {
            alert("팀 이름을 입력해주세요.");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create Team
            const { data: newTeam, error: teamError } = await supabase.from('teams').insert({
                captain_id: playerId,
                sport_type: sportId,
                team_name: teamName,
                description: teamDesc,
                emblem_url: emblemUrl,
                location: location, // Add location
                lat: lat, // Add lat
                lng: lng  // Add lng
            }).select().single();

            if (teamError) throw teamError;
            if (!newTeam) throw new Error("팀 생성 실패");

            // 2. Add to team_members
            const { error: memberError } = await supabase.from('team_members').insert({
                team_id: newTeam.id,
                player_id: playerId,
                role: 'LEADER'
            });

            if (memberError) throw memberError;

            // 3. Update Profile Roles (for badge)
            // Need to update roles json: { [sportId]: 'captain' }
            if (userId) {
                const { data: profile } = await supabase.from('profiles').select('roles').eq('id', userId).single();
                const newRoles = { ...(profile?.roles || {}), [sportId]: 'captain' };
                await supabase.from('profiles').update({ roles: newRoles }).eq('id', userId);
            }

            alert(`${teamName} 팀이 창단되었습니다!`);
            router.refresh();
            router.back(); // Return to list/profile context

        } catch (e: any) {
            console.error(e);
            alert("팀 창단 중 오류가 발생했습니다: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.titleSection}>
                <h1 className={styles.title}>
                    <span style={{ marginRight: '0.5rem' }}>{sportIcon}</span>
                    {sportName} 새 팀 창단
                </h1>
                <p className={styles.subtitle}>새로운 팀을 만들어 동료들을 모아보세요!</p>
            </div>

            <div className={styles.formSection}>
                <div className={styles.emblemUpload}>
                    <div className={styles.emblemPreview} onClick={() => emblemInputRef.current?.click()}>
                        {emblemUrl ? <img src={emblemUrl} alt="Emblem" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>🛡️</span>}
                    </div>
                    <button className={styles.uploadButton} onClick={() => emblemInputRef.current?.click()}>엠블럼 등록</button>
                    <input type="file" hidden ref={emblemInputRef} onChange={handleFileChange} accept="image/*" />
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>팀 이름</label>
                    <input type="text" className={styles.input} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="멋진 팀 이름을 지어주세요" />
                </div>

                {/* Location Picker */}
                <GoogleLocationPicker onLocationSelect={handleLocationSelect} initialAddress={location} />

                <div className={styles.fieldGroup}>
                    <label className={styles.label}>한줄 소개</label>
                    <textarea
                        className={styles.textArea}
                        value={teamDesc}
                        onChange={(e) => setTeamDesc(e.target.value)}
                        placeholder="팀의 목표나 소개를 간단히 작성해주세요. (예: 매주 토요일 오전 풋살, 초보 환영!)"
                    />
                </div>
            </div>

            <button className={styles.submitButton} onClick={handleSubmit} disabled={submitting}>
                {submitting ? '창단 중...' : '팀 창단하기'}
            </button>

            {/* Crop Modal */}
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
