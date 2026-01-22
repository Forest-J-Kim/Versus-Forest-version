"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import teamStyles from "../../[teamId]/team.module.css";
import styles from "./edit.module.css";
import PlayerSelectModal from "./components/PlayerSelectModal";
import EditTeamInfoModal from "./components/EditTeamInfoModal";
import Cropper from 'react-easy-crop';

interface PageProps {
    params: Promise<{ teamId: string }>;
}

export default function TeamEditPage({ params }: PageProps) {
    const router = useRouter();
    const resolvedParams = use(params);
    const teamId = resolvedParams.teamId;
    const supabase = createClient();

    const [team, setTeam] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Edit States
    const [introduction, setIntroduction] = useState('');
    const [coachCareer, setCoachCareer] = useState('');
    const [coachesList, setCoachesList] = useState<any[]>([]);
    const [representativePlayers, setRepresentativePlayers] = useState<any[]>(new Array(4).fill(null));
    const [formation, setFormation] = useState<{ [key: string]: string }>({}); // { slotId: playerId }

    // Modals
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [captainModalOpen, setCaptainModalOpen] = useState(false);
    const [addCoachModalOpen, setAddCoachModalOpen] = useState(false);

    // Rep Player Modal
    const [repModalOpen, setRepModalOpen] = useState(false);
    const [activeRepSlot, setActiveRepSlot] = useState<number | null>(null);

    // Formation Modal
    const [formationModalOpen, setFormationModalOpen] = useState(false);
    const [activeSlot, setActiveSlot] = useState<string | null>(null);

    // Image Upload State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            setCurrentUserId(user.id);

            // 1. Fetch Team
            const { data: teamData, error } = await supabase.from('teams').select('*').eq('id', teamId).single();
            if (error || !teamData) {
                alert("팀 정보를 불러올 수 없습니다.");
                router.back();
                return;
            }

            // Security Check
            if (teamData.captain_id !== user.id) {
                alert("팀장만 수정할 수 있습니다.");
                router.replace(`/team/${teamId}`);
                return;
            }

            // 2. Fetch Players
            const { data: playersData } = await supabase.from('players').select('*').eq('team_id', teamId);

            // 3. Helper: Get Captain Name & Player Record
            let captainName = '정보 없음';
            let captainPlayer = null;

            if (teamData.captain_id) {
                // Name Strategy 1: Profile
                const { data: capProfile } = await supabase.from('profiles').select('nickname, username, full_name').eq('id', teamData.captain_id).single();
                if (capProfile) {
                    captainName = capProfile.nickname || capProfile.username || capProfile.full_name || '정보 없음';
                }

                // Player Record Strategy: Fetch all players for this user, find best match
                const { data: userPlayers } = await supabase
                    .from('players')
                    .select('*')
                    .eq('user_id', teamData.captain_id);

                if (userPlayers && userPlayers.length > 0) {
                    // Try to find exact sport match, then case-insensitive, then just first
                    const exactMatch = userPlayers.find(p => p.sport_type === teamData.sport_type);
                    const caseMatch = userPlayers.find(p => p.sport_type?.toLowerCase() === teamData.sport_type?.toLowerCase());
                    captainPlayer = exactMatch || caseMatch || userPlayers[0];
                }

                // Name Strategy 2: Player Name (fallback)
                if (captainName === '정보 없음' && captainPlayer && captainPlayer.name) {
                    captainName = captainPlayer.name;
                }
            }
            teamData.captain_name = captainName;

            // Merge Captain into Players List
            let allPlayers = playersData || [];
            if (captainPlayer) {
                // Check if captain is already in the list (by id)
                if (!allPlayers.some(p => p.id === captainPlayer.id)) {
                    allPlayers = [captainPlayer, ...allPlayers];
                }
            }

            setTeam(teamData);
            setPlayers(allPlayers);
            setIntroduction(teamData.introduction || '');
            setFormation(teamData.formation || {}); // Load existing formation

            // Init Coach List
            let loadedCoaches = teamData.coaches_info || [];

            // Init Representative Players
            let repList = teamData.representative_players || new Array(4).fill(null);
            // Ensure size 4
            while (repList.length < 4) repList.push(null);
            setRepresentativePlayers(repList);

            // Migration/Safety: If empty but we have captain, ensure at least captain is there
            if (loadedCoaches.length === 0 && captainPlayer) {
                loadedCoaches = [{
                    user_id: captainPlayer.user_id || teamData.captain_id,
                    name: captainPlayer.name || captainName,
                    role: '메인 관장',
                    career: teamData.description || '',
                    photoUrl: captainPlayer.avatar_url || captainPlayer.photo_url || null
                }];
            } else if (loadedCoaches.length > 0 && !loadedCoaches[0].user_id && captainPlayer) {
                // Retrofit legacy first item if it matches simple career
                loadedCoaches[0].user_id = captainPlayer.user_id || teamData.captain_id;
                loadedCoaches[0].name = captainPlayer.name || captainName;
                loadedCoaches[0].role = '메인 관장';
            }

            // [FIX]: Sync latest avatar from allPlayers (which fetches from players table)
            loadedCoaches = loadedCoaches.map((coach: any) => {
                if (coach.user_id) {
                    const match = allPlayers.find((p: any) => p.user_id === coach.user_id);
                    if (match) {
                        return { ...coach, name: match.name, photoUrl: match.avatar_url || match.photo_url || coach.photoUrl };
                    }
                }
                return coach;
            });

            setCoachesList(loadedCoaches);

            // Keep legacy (optional)
            if (loadedCoaches.length > 0 && loadedCoaches[0].career) {
                setCoachCareer(loadedCoaches[0].career);
            }

            setLoading(false);
        };
        fetchData();
    }, [teamId, router]);

    // Image Handlers
    const handleEmblemClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageSrc(reader.result?.toString() || null);
            setIsCropModalOpen(true);
        });
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setUploading(true);
        try {
            // Import helper dynamically or assume it exists in utils
            const { default: getCroppedImg } = await import('@/utils/canvasUtils');
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

            if (!croppedImageBlob) throw new Error("이미지 생성 실패");

            const fileName = `team_${teamId}_${Date.now()}.jpg`.replace(/[^a-zA-Z0-9.]/g, '');
            const { error: uploadError } = await supabase.storage.from('emblems').upload(fileName, croppedImageBlob, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('emblems').getPublicUrl(fileName);

            const { error: updateError } = await supabase.from('teams').update({ emblem_url: publicUrl }).eq('id', teamId);
            if (updateError) throw updateError;

            setTeam({ ...team, emblem_url: publicUrl });
            alert("엠블럼이 변경되었습니다.");
        } catch (e: any) {
            alert("이미지 업로드 실패: " + e.message);
        } finally {
            setUploading(false);
            setIsCropModalOpen(false);
            setImageSrc(null);
        }
    };

    // Actions
    const handleInfoSave = async (updated: any) => {
        const { error } = await supabase.from('teams').update(updated).eq('id', teamId);
        if (error) {
            alert("저장 실패: " + error.message);
        } else {
            setTeam({ ...team, ...updated });
        }
    };

    const handleCaptainChange = async (player: any) => {
        if (!confirm(`주장을 ${player.name} 님으로 변경하시겠습니까?\n변경 후에는 권한이 상실되어 메인 화면으로 이동합니다.`)) return;

        const { error } = await supabase.from('teams').update({ captain_id: player.user_id }).eq('id', teamId);
        if (error) {
            alert("변경 실패: " + error.message);
        } else {
            alert("주장이 변경되었습니다.");
            router.push(`/team/${teamId}`); // Redirect effectively kicks out of edit mode
        }
    };

    const handleKickMember = async (player: any) => {
        if (!confirm(`${player.name} 선수를 팀에서 제외(방출)하시겠습니까?`)) return;

        const { error } = await supabase.from('players').update({ team_id: null }).eq('id', player.id);
        if (error) {
            alert("방출 실패: " + error.message);
        } else {
            setPlayers(players.filter(p => p.id !== player.id));
            // Also remove from formation if exists
            // A bit complex to find which slot, but map check is easier
            const newFormation = { ...formation };
            Object.keys(newFormation).forEach(key => {
                if (newFormation[key] === player.id) delete newFormation[key];
            });
            setFormation(newFormation);
        }
    };

    // Rep Player Handlers
    const handleRepSlotClick = (index: number) => {
        setActiveRepSlot(index);
        setRepModalOpen(true);
    };

    const handleRepPlayerSelect = (player: any) => {
        // Check duplicate
        const isDuplicate = representativePlayers.includes(player.id);
        const isSameSlot = activeRepSlot !== null && representativePlayers[activeRepSlot] === player.id;

        if (isDuplicate && !isSameSlot) {
            alert("이미 다른 슬롯에 등록된 대표 선수입니다.");
            return;
        }

        if (activeRepSlot === null) return;
        const newList = [...representativePlayers];
        newList[activeRepSlot] = player.id;
        setRepresentativePlayers(newList);
        setRepModalOpen(false);
        setActiveRepSlot(null);
    };

    const handleRepClear = () => {
        if (activeRepSlot !== null) {
            const newList = [...representativePlayers];
            newList[activeRepSlot] = null;
            setRepresentativePlayers(newList);
            setRepModalOpen(false);
            setActiveRepSlot(null);
        }
    };

    // Coach Management Handlers
    const handleAddCoach = (player: any) => {
        // Check duplicate
        if (coachesList.some(c => c.user_id === player.user_id)) {
            alert('이미 목록에 있는 코치입니다.');
            return;
        }

        const isCaptain = player.user_id === team.captain_id;
        const newCoach = {
            user_id: player.user_id,
            name: player.name,
            role: isCaptain ? '메인 관장' : '코치',
            career: '',
            photoUrl: player.avatar_url || player.photo_url || null
        };
        setCoachesList([...coachesList, newCoach]);
        setAddCoachModalOpen(false);
    };

    const handleRemoveCoach = (index: number) => {
        if (!confirm('해당 코치진을 목록에서 제거하시겠습니까?')) return;
        const newList = [...coachesList];
        newList.splice(index, 1);
        setCoachesList(newList);
    };

    const handleCoachUpdate = (index: number, field: string, value: string) => {
        const newList = [...coachesList];
        newList[index] = { ...newList[index], [field]: value };
        setCoachesList(newList);
    };

    const handleFormationSlotClick = (slotId: string) => {
        setActiveSlot(slotId);
        setFormationModalOpen(true);
    };

    const handleFormationSelect = (player: any) => {
        if (activeSlot) {
            setFormation({ ...formation, [activeSlot]: player.id });
        }
        setFormationModalOpen(false);
        setActiveSlot(null);
    };

    const handleFormationClear = () => {
        if (activeSlot) {
            const newFormation = { ...formation };
            delete newFormation[activeSlot];
            setFormation(newFormation);
        }
        setFormationModalOpen(false);
        setActiveSlot(null);
    };

    const handleGlobalSave = async () => {
        const { error } = await supabase.from('teams').update({
            introduction: introduction,
            formation: formation,
            coaches_info: coachesList,
            representative_players: representativePlayers
        }).eq('id', teamId);

        if (error) {
            alert("저장 실패: " + error.message);
        } else {
            alert("수정 완료되었습니다.");
            router.refresh();
            router.push(`/team/${teamId}`);
        }
    };

    if (loading) return <div className={teamStyles.container}>로딩 중...</div>;
    // ... [existing isTeamSport] check
    const isTeamSport = ['soccer', 'foot', 'futsal', 'base', 'basket', 'volley', 'jokgu'].some(k => team.sport_type?.toLowerCase().includes(k));

    // Formation Slots Definition (4-3-3 Standard)
    const formationSlots = [
        { id: 'gk', label: 'GK', top: '90%', left: '50%' },
        { id: 'lb', label: 'LB', top: '75%', left: '15%' },
        { id: 'lcb', label: 'CB', top: '80%', left: '38%' },
        { id: 'rcb', label: 'CB', top: '80%', left: '62%' },
        { id: 'rb', label: 'RB', top: '75%', left: '85%' },
        { id: 'lcm', label: 'LCM', top: '55%', left: '30%' },
        { id: 'cdm', label: 'CDM', top: '60%', left: '50%' },
        { id: 'rcm', label: 'RCM', top: '55%', left: '70%' },
        { id: 'lw', label: 'LW', top: '25%', left: '20%' },
        { id: 'st', label: 'ST', top: '15%', left: '50%' },
        { id: 'rw', label: 'RW', top: '25%', left: '80%' }
    ];

    return (
        <main className={`${teamStyles.container} ${styles.editContainer}`}>
            {/* ... [existing header and contents] */}
            {/* I need to be careful with replace range */}
            {/* I will only replace from handleGlobalSave onwards to end of modals area */}
            <h2 className={teamStyles.sectionTitle}>팀 프로필 수정</h2>

            {/* Hidden File Input */}
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />

            {/* Header: Basic Info */}
            <header className={`${teamStyles.header} ${styles.editableHeader}`} onClick={() => setIsInfoModalOpen(true)}>
                <div className={styles.editOverlay}>클릭하여 기본 정보 수정</div>
                <div className={teamStyles.headerContent}>
                    <div className={teamStyles.emblem}
                        style={{ position: 'relative', overflow: 'hidden', zIndex: 20, cursor: 'pointer' }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEmblemClick();
                        }}
                    >
                        {team.emblem_url ? (
                            <img src={team.emblem_url} alt={team.team_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : '🛡️'}
                    </div>
                    <div className={teamStyles.teamInfo}>
                        <h1 className={teamStyles.teamName}>{team.team_name} <span className={styles.editIcon}>✎</span></h1>
                        <p className={teamStyles.teamDesc}>{team.description || '한줄 소개 없음'}</p>

                        <div className={teamStyles.metaInfo}>
                            {/* Captain - Click to Change */}
                            <div className={teamStyles.metaItem} onClick={(e) => { e.stopPropagation(); setCaptainModalOpen(true); }} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                                <span className={teamStyles.metaLabel}>{isTeamSport ? '주장' : '관장'}:</span>
                                <span className={teamStyles.metaValue}>
                                    {team.captain_name} (변경)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Introduction - Inline Edit */}
            <section className={teamStyles.section}>
                <h3 className={teamStyles.subTitle}>팀 상세 소개</h3>
                <textarea
                    className={styles.introTextarea}
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    placeholder="팀의 상세한 소개글을 작성해주세요. (이력, 가입 문의, 모임 시간 등)"
                />
            </section>

            {/* Coach Management - Gym Only */}
            {!isTeamSport && (
                <>
                    <section className={teamStyles.section}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className={teamStyles.subTitle} style={{ marginBottom: 0 }}>코치진(지도자) 관리</h3>
                            <button
                                type="button"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#EFF6FF', color: '#3B82F6', border: 'none', borderRadius: '6px', fontWeight: 600 }}
                                onClick={() => setAddCoachModalOpen(true)}
                            >
                                + 코치 추가
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {coachesList.length === 0 && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '12px' }}>
                                    등록된 코치진이 없습니다.
                                </div>
                            )}
                            {coachesList.map((coach, idx) => (
                                <div key={idx} style={{
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    background: 'white',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <img
                                            src={coach.photoUrl || 'https://via.placeholder.com/60'}
                                            alt={coach.name}
                                            style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', background: '#F3F4F6' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.2rem' }}>{coach.name}</div>
                                            <input
                                                type="text"
                                                placeholder="역할 (예: 메인 관장, 코치)"
                                                value={coach.role || ''}
                                                onChange={(e) => handleCoachUpdate(idx, 'role', e.target.value)}
                                                style={{
                                                    fontSize: '0.85rem', padding: '0.2rem 0.5rem',
                                                    border: '1px solid #D1D5DB', borderRadius: '4px', width: '100%', maxWidth: '150px'
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCoach(idx)}
                                            style={{ height: 'fit-content', padding: '0.3rem 0.6rem', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '4px', fontSize: '0.8rem' }}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                    <textarea
                                        className={styles.introTextarea}
                                        style={{ minHeight: '80px', fontSize: '0.9rem' }}
                                        value={coach.career || ''}
                                        onChange={(e) => handleCoachUpdate(idx, 'career', e.target.value)}
                                        placeholder="경력 사항이나 인사말을 입력해주세요."
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className={teamStyles.section}>
                        <h3 className={teamStyles.subTitle}>대표 선수 설정 (최대 4명)</h3>
                        <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '1rem' }}>
                            빈 슬롯을 클릭하여 대표 선수를 선택하세요. 등록된 선수를 클릭하면 해제/변경할 수 있습니다.
                        </p>
                        <div className={teamStyles.repGrid}>
                            {representativePlayers.map((playerId, idx) => {
                                const player = playerId ? players.find(p => p.id === playerId) : null;
                                return (
                                    <div key={idx} className={teamStyles.repCard} onClick={() => handleRepSlotClick(idx)}>
                                        {player ? (
                                            <>
                                                <img
                                                    src={player.avatar_url || player.photo_url || 'https://via.placeholder.com/60'}
                                                    alt={player.name}
                                                    className={teamStyles.repAvatar}
                                                />
                                                <div className={teamStyles.repName}>{player.name}</div>
                                            </>
                                        ) : (
                                            <div className={teamStyles.repEmpty}>+</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}

            {isTeamSport && (
                <section className={teamStyles.section}>
                    {/* ... [existing formation logic] ... */}
                    <h2 className={teamStyles.sectionTitle}>Best 11 포메이션 설정</h2>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                        원을 클릭하여 선수를 배치하세요.
                    </p>
                    <div className={teamStyles.pitchContainer}>
                        {/* Pitch Lines */}
                        <div className={teamStyles.pitchLineMid}></div>
                        <div className={teamStyles.pitchCircle}></div>
                        <div className={teamStyles.pitchBoxTop}></div>
                        <div className={teamStyles.pitchBoxBottom}></div>

                        {/* Interactive Slots */}
                        {formationSlots.map(slot => {
                            const assignedPlayerId = formation[slot.id];
                            const player = players.find(p => p.id === assignedPlayerId);

                            return (
                                <div
                                    key={slot.id}
                                    className={`${teamStyles.formationNode} ${styles.interactiveNode}`}
                                    style={{ top: slot.top, left: slot.left }}
                                    onClick={() => handleFormationSlotClick(slot.id)}
                                >
                                    {player ? (
                                        <>
                                            <img
                                                src={player.avatar_url || player.photo_url || 'https://via.placeholder.com/40'}
                                                alt={player.name}
                                                className={teamStyles.nodeAvatar}
                                            />
                                            <div className={teamStyles.nodeName}>{player.name}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className={`${teamStyles.nodeEmpty} ${styles.nodeEmptyActive}`}>+</div>
                                            <div className={teamStyles.nodeName}>{slot.label}</div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Member Management */}
            <section className={teamStyles.section}>
                <h2 className={teamStyles.sectionTitle}>선수 관리 ({players.length})</h2>
                <div className={teamStyles.memberGrid2Col}>
                    {players.map(player => (
                        <div key={player.id} className={teamStyles.memberCard} style={{ position: 'relative', overflow: 'hidden' }}>
                            <div className={teamStyles.memberPos}>{player.skills?.position || '-'}</div>
                            <img
                                src={player.avatar_url || player.photo_url || 'https://via.placeholder.com/40'}
                                alt={player.name}
                                className={teamStyles.memberAvatarSmall}
                            />
                            <div className={teamStyles.memberNameBox}>
                                <span className={teamStyles.memberNameText}>{player.name}</span>
                                {player.user_id === team.captain_id && <span className={teamStyles.captainBadge}>C</span>}
                            </div>

                            {/* Kick Button */}
                            {player.user_id !== team.captain_id && (
                                <button
                                    className={styles.kickButton}
                                    onClick={() => handleKickMember(player)}
                                >
                                    방출
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Global Save Button */}
            <div className={styles.stickyFooter}>
                <button className={styles.saveAllButton} onClick={handleGlobalSave}>
                    수정 완료
                </button>
            </div>

            {/* Modals */}
            <EditTeamInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
                team={team}
                captainName={team.captain_name}
                onChangeCaptain={() => setCaptainModalOpen(true)}
                onSave={handleInfoSave}
            />

            <PlayerSelectModal
                isOpen={captainModalOpen}
                onClose={() => setCaptainModalOpen(false)}
                players={players.filter(p => p.user_id !== team.captain_id)} // Exclude current captain
                onSelect={(player) => { setCaptainModalOpen(false); handleCaptainChange(player); }}
                title="새로운 주장 선택"
            />

            <PlayerSelectModal
                isOpen={addCoachModalOpen}
                onClose={() => setAddCoachModalOpen(false)}
                players={players} // Can add duplicates? Maybe. Or filter out those already in coachesList.
                onSelect={handleAddCoach}
                title="코치로 추가할 멤버 선택"
            />

            <PlayerSelectModal
                isOpen={repModalOpen}
                onClose={() => setRepModalOpen(false)}
                players={players}
                onSelect={handleRepPlayerSelect}
                title="대표 선수 선택"
                onClear={activeRepSlot !== null && representativePlayers[activeRepSlot] ? handleRepClear : undefined}
            />

            <PlayerSelectModal
                isOpen={formationModalOpen}
                onClose={() => setFormationModalOpen(false)}
                players={players}
                onSelect={handleFormationSelect}
                onClear={activeSlot && formation[activeSlot] ? handleFormationClear : undefined}
                title={`${activeSlot?.toUpperCase()} 포지션 선수 선택`}
            />

            {/* Clear option for formation? Using special handling or button in modal header maybe? 
                For now, if slot has player, maybe clicking opens modal which could have "Clear" button?
                Let's hack it: PlayerSelectModal currently just lists players. 
                I'll add a modification to PlayerSelectModal call or just render a "Clear" button inside the modal if activeSlot has value.
                But PlayerSelectModal is generic.
                I will skip clear for now or simple re-select overwrites.
                Actually user asked: "이미 선수가 있는 슬롯 클릭 -> 선수 교체 또는 해제(제거) 옵션 제공."
                I will improvise by checking if formation[activeSlot] exists, show confirm/action sheet?
                Or just add a "Unassign" item to the list in PlayerSelectModal?
                Let's stick to standard flow for now.
            */}
            {/* Crop Modal Reuse */}
            {isCropModalOpen && imageSrc && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'black', zIndex: 2000,
                    display: 'flex', flexDirection: 'column'
                }}>
                    <CropperWrapper
                        imageSrc={imageSrc}
                        crop={crop} zoom={zoom}
                        setCrop={setCrop} setZoom={setZoom}
                        onCropComplete={onCropComplete}
                        onClose={() => setIsCropModalOpen(false)}
                        onSave={handleCropSave}
                        uploading={uploading}
                    />
                </div>
            )}
        </main>
    );
}

function CropperWrapper({ imageSrc, crop, zoom, setCrop, setZoom, onCropComplete, onClose, onSave, uploading }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            <div style={{ padding: '1rem', backgroundColor: 'white', display: 'flex', gap: '1rem' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>취소</button>
                <button onClick={onSave} disabled={uploading} style={{ flex: 1, padding: '1rem', backgroundColor: '#3B82F6', color: 'white', borderRadius: '0.5rem' }}>
                    {uploading ? '업로드 중...' : '저장'}
                </button>
            </div>
        </div>
    );
}
