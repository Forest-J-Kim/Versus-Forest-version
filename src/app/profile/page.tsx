"use client";

import React, { useEffect, useState, useCallback } from 'react';
import styles from './profile.module.css';
import { SPORTS, Sport } from "@/app/page";
import { createClient } from "@/utils/supabase/client";

import { useRouter } from 'next/navigation';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/canvasUtils';
import MySportSummaryCard from '@/components/features/sport/MySportSummaryCard';

export default function ProfilePage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [userProfile, setUserProfile] = useState<{ id: string; name: string; email?: string; roles: any; avatarUrl?: string } | null>(null);

    const [mySports, setMySports] = useState<any[]>([]);

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const fetchUser = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            const displayName = profile?.nickname || profile?.username || profile?.full_name || user.email?.split('@')[0] || "회원";

            setUserProfile({
                id: user.id,
                name: displayName,
                email: user.email,
                roles: profile?.roles || {},
                avatarUrl: profile?.avatar_url
            });

            // Fetch My Players and Teams
            const { data: players } = await supabase.from('players').select('*').eq('user_id', user.id);
            const { data: teams } = await supabase.from('teams').select('*').eq('captain_id', user.id);

            const combined = [
                ...(players || []).map((p: any) => ({ ...p, type: 'PLAYER' })),
                ...(teams || []).map((t: any) => ({ ...t, type: 'TEAM' }))
            ];
            setMySports(combined);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUser();
    }, []);



    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    // 1. File Select -> Read as DataURL -> Open Modal
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || null);
            setIsCropModalOpen(true);
        });
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again if cancelled
        event.target.value = '';
    };

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // 2. Save Filtered/Cropped Image
    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels || !userProfile) return;

        setUploading(true);
        try {
            // A. Get Cropped Blob
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error("Cropping failed");

            // B. Upload Blob (Root of bucket, sanitized name)
            const fileName = `avatar_${userProfile.id}_${Date.now()}.jpg`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImageBlob, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // C. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // D. Update DB
            if (userProfile?.id) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', userProfile.id);

                if (updateError) throw updateError;

                setUserProfile(prev => prev ? { ...prev, avatarUrl: publicUrl } : null);
                alert("프로필 사진이 변경되었습니다!");
            }
        } catch (e) {
            console.error(e);
            alert("사진 저장 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
            setIsCropModalOpen(false);
            setImageSrc(null); // Cleanup
        }
    };

    if (loading) {
        return <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>로딩 중...</div>;
    }

    if (!userProfile) {
        return <div className={styles.container}>로그인이 필요합니다.</div>;
    }

    const captainBadges = userProfile.roles ? Object.keys(userProfile.roles).filter(key => userProfile.roles[key] === 'captain') : [];

    return (
        <main className={styles.container}>
            <h1 className={styles.sectionTitle}>내 정보</h1>
            <section className={styles.headerSection}>

                {/* Avatar with Click Handler */}
                <div className={styles.avatarContainer} onClick={handleAvatarClick} style={{ cursor: 'pointer', position: 'relative' }}>
                    {userProfile.avatarUrl ? (
                        // Use img tag for avatar
                        <img
                            src={userProfile.avatarUrl}
                            key={userProfile.avatarUrl}
                            alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/150?text=Error';
                            }}
                        />
                    ) : (
                        <div className={styles.avatar}>👤</div>
                    )}

                    {/* Small Edit Icon Overlay */}
                    <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        backgroundColor: '#3B82F6', color: 'white',
                        borderRadius: '50%', width: '1.5rem', height: '1.5rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', border: '2px solid white'
                    }}>
                        ✏️
                    </div>
                </div>

                {/* Hidden File Input */}
                <input
                    type="file"
                    id="avatar-upload"
                    hidden
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />

                <div className={styles.userName}>{userProfile.name}</div>

                {/* Captain Status Badge */}
                <div
                    className={styles.userTypeBadge}
                >
                    {captainBadges.length > 0 ? (
                        <>
                            <span style={{ fontWeight: 'bold', color: '#4B5563', marginRight: '4px' }}>캡틴:</span>
                            {captainBadges.map(sportKey => {
                                // Specific Emoji Mapping as requested
                                let emoji = '🏅';
                                const key = sportKey.toLowerCase();
                                if (key.includes('soccer') || key.includes('futsal')) emoji = '⚽';
                                else if (key.includes('boxing')) emoji = '🥊';
                                else if (key.includes('health') || key.includes('gym')) emoji = '🏋️';
                                else if (key.includes('baseball')) emoji = '⚾';
                                else if (key.includes('basketball')) emoji = '🏀';
                                else if (key.includes('racket') || key.includes('badminton') || key.includes('tennis')) emoji = '🏸';
                                else if (key.includes('martial') || key.includes('judo') || key.includes('jujitsu')) emoji = '🥋';
                                else if (key.includes('kick')) emoji = '🦶'; // Kickboxing

                                return (
                                    <span key={sportKey} style={{ fontSize: '1.2rem', marginLeft: '2px' }}>
                                        {emoji}
                                    </span>
                                );
                            })}
                        </>
                    ) : (
                        <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>일반 회원</span>
                    )}
                </div>
            </section>

            <section className={styles.sportsSection} style={{ minHeight: '200px' }}>
                <h2 className={styles.sectionTitle}>내 종목별 프로필</h2>

                {/* Dynamic Data Content */}
                <div style={{ paddingBottom: '2rem' }}>
                    {mySports.length === 0 ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem', backgroundColor: '#F9FAFB', borderRadius: '1rem', border: '1px dashed #D1D5DB',
                            color: '#6B7280'
                        }}>
                            <p style={{ marginBottom: '1rem' }}>등록된 종목 정보가 없습니다.</p>
                            <button
                                className={styles.addSportButton}
                                style={{ width: 'auto', padding: '0.5rem 1.5rem', fontSize: '0.9rem', borderRadius: '0.5rem' }}
                                onClick={() => router.push('/profile/register')}
                            >
                                + 프로필 등록하기
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Group by Sport and Render Nested Cards */}
                            {(() => {
                                const grouped: { [key: string]: { player?: any; team?: any } } = {};
                                mySports.forEach(item => {
                                    const key = item.sport_type.toLowerCase();
                                    if (!grouped[key]) grouped[key] = {};
                                    if (item.type === 'PLAYER') grouped[key].player = item;
                                    if (item.type === 'TEAM') grouped[key].team = item;
                                });

                                return Object.keys(grouped).map(sportKey => {
                                    const group = grouped[sportKey];
                                    // Find Sport Meta
                                    const sportMeta = SPORTS.find(s => s.id === sportKey.toUpperCase());
                                    const sportName = sportMeta?.name || sportKey.toUpperCase();
                                    const sportIcon = sportMeta?.icon || '🏅';

                                    // Only render if there is at least a player profile
                                    if (!group.player) return null;

                                    return (
                                        <MySportSummaryCard
                                            key={sportKey}
                                            sportName={sportName}
                                            sportIcon={sportIcon}
                                            playerData={group.player}
                                            teamData={group.team}
                                            userAvatarUrl={group.player?.avatar_url || userProfile.avatarUrl}
                                            onRegisterTeam={() => router.push(`/profile/register/${sportKey}`)} // Or open modal
                                            onEditProfile={() => router.push(`/profile/edit/${sportKey}`)}
                                        />
                                    );
                                });
                            })()}

                            {/* Add More Button */}
                            <button
                                className={styles.addSportButton}
                                style={{ width: '100%', padding: '1rem', fontSize: '0.9rem', borderRadius: '0.75rem', marginTop: '0.5rem' }}
                                onClick={() => router.push('/profile/register')}
                            >
                                + 다른 종목 추가하기
                            </button>
                        </div>
                    )}
                </div>
            </section>



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
                            cropShape="round"
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'white' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>Zoom</label>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => { setIsCropModalOpen(false); setImageSrc(null); }}
                                style={{ flex: 1, padding: '0.8rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCropSave}
                                disabled={uploading}
                                style={{ flex: 1, padding: '0.8rem', backgroundColor: '#2563EB', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold' }}
                            >
                                {uploading ? '저장 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

