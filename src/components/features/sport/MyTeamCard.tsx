import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import styles from './MyTeamCard.module.css';

import { useRouter } from "next/navigation";

interface MyTeamCardProps {
    teamId?: string;
    teamName: string;
    captainName: string;
    description?: string;
    isRegistered?: boolean;
    emblemUrl?: string;
    title?: string;
    sportType?: string;
    rating?: number;
    history?: ('WIN' | 'DRAW' | 'LOSS')[];
    isCaptain?: boolean;
}

export default function MyTeamCard({
    teamId,
    teamName,
    captainName,
    description,
    isRegistered = true,
    emblemUrl,
    title = "나의 팀",
    sportType = "",
    rating = 5,
    history = [],
    isCaptain = false
}: MyTeamCardProps) {
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const supabase = createClient();

    // Determine Layout Mode
    // Group A (Team Sports): soccer, baseball, basketball, volleyball, futsal, etc.
    // Group B (Gym/Individual): boxing, mma, judo, gym, tennis, badminton, etc.
    const isTeamSport = ['soccer', 'foot', 'futsal', 'base', 'basket', 'volley', 'jokgu'].some(k => sportType.toLowerCase().includes(k));

    useEffect(() => {
        const fetchMembers = async () => {
            if (!teamId || isTeamSport) return; // Don't fetch members for Team Sports
            const { data } = await supabase
                .from('players')
                .select('id, name, weight_class, avatar_url, photo_url')
                .eq('team_id', teamId)
                .limit(4);

            if (data) {
                setMembers(data);
            }
        };

        const fetchPendingRequests = async () => {
            if (!teamId || !isCaptain) return;
            const { count } = await supabase
                .from('team_requests')
                .select('id', { count: 'exact', head: true })
                .eq('team_id', teamId)
                .eq('status', 'pending');

            if (count !== null) setPendingCount(count);
        }

        if (isRegistered && teamId) {
            fetchMembers();
            fetchPendingRequests();
        }
    }, [teamId, isRegistered, isTeamSport, isCaptain]); // Refresh when modal closes

    if (!isRegistered) {
        return (
            <div className={styles.card} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px', background: '#F9FAFB' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚽</div>
                    <div style={{ fontWeight: 'bold', color: '#374151' }}>나의 소속팀 정보가 없습니다</div>
                    <button style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        + 팀 등록 신청하기
                    </button>
                </div>
            </div>
        );
    }

    // Grid Placeholders (always 4 slots)
    const gridItems = [...members];
    while (gridItems.length < 4) {
        gridItems.push({ id: `placeholder-${gridItems.length}`, isPlaceholder: true });
    }

    // Label Logic
    const roleLabel = isTeamSport ? '주장' : '관장';

    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <span className={styles.sectionTitle}>{title}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isCaptain && teamId && (
                        <button
                            onClick={() => router.push(`/team/manage/${teamId}`)}
                            style={{
                                border: '1px solid #E5E7EB',
                                background: pendingCount > 0 ? '#FEF2F2' : 'white',
                                color: pendingCount > 0 ? '#DC2626' : '#374151',
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: pendingCount > 0 ? '700' : '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            선수등록
                            {pendingCount > 0 && (
                                <span style={{ background: '#DC2626', color: 'white', borderRadius: '999px', fontSize: '0.6rem', padding: '0 4px', minWidth: '14px', textAlign: 'center' }}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => teamId && router.push(`/team/${teamId}`)}
                        className={styles.moreLink}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
                    >
                        + 더보기
                    </button>
                </div>
            </div>

            <div className={styles.teamContent}>
                <div className={styles.emblem} style={{ overflow: 'hidden' }}>
                    {emblemUrl ? (
                        <img
                            src={emblemUrl}
                            alt={teamName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = '🛡️'; }}
                        />
                    ) : '🛡️'}
                </div>
                <div className={styles.info}>
                    <div className={styles.teamName}>{teamName}</div>
                    {description && <div className={styles.teamDesc} style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '0.25rem' }}>{description}</div>}
                    <div className={styles.teamMeta}>{roleLabel}: {captainName}</div>

                    {/* Rating only for Team Sports */}
                    {isTeamSport && (
                        <div className={styles.teamMeta}>
                            평점: <span className={styles.stars}>{"★".repeat(Math.floor(rating))}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Conditional Bottom Section */}
            {isTeamSport ? (
                // Case A: Team Sport -> Match History
                <>
                    <div className={styles.historyTitle}>매치 히스토리</div>
                    <div className={styles.historyRow}>
                        {history.length > 0 ? history.map((result, idx) => (
                            <div
                                key={idx}
                                className={`${styles.badge} ${result === 'WIN' ? styles.win : result === 'DRAW' ? styles.draw : styles.loss}`}
                            >
                                {result === 'WIN' ? '승' : result === 'DRAW' ? '무' : '패'}
                            </div>
                        )) : <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>- 기록 없음 -</span>}
                    </div>
                </>
            ) : (
                // Case B: Gym Sport -> Member Grid
                <div className={styles.membersSection} style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6B7280', marginBottom: '0.5rem' }}>대표 선수</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                        {(() => {
                            const gridItems = [...members];
                            while (gridItems.length < 4) {
                                gridItems.push({ id: `placeholder-${gridItems.length}`, isPlaceholder: true });
                            }
                            return gridItems.map((member) => (
                                <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{
                                        width: '100%', aspectRatio: '1/1', borderRadius: '8px',
                                        background: '#F3F4F6', overflow: 'hidden', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB'
                                    }}>
                                        {!member.isPlaceholder ? (
                                            (member.avatar_url || member.photo_url) ? (
                                                <img src={member.avatar_url || member.photo_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : <span style={{ fontSize: '1.5rem', color: '#9CA3AF' }}>👤</span>
                                        ) : (
                                            <span style={{ color: '#D1D5DB' }}>-</span>
                                        )}
                                    </div>
                                    {!member.isPlaceholder && (
                                        <div style={{ fontSize: '0.7rem', textAlign: 'center', lineHeight: '1.2' }}>
                                            <div style={{ fontWeight: 'bold', color: '#374151' }}>{member.name}</div>
                                            <div style={{ color: '#6B7280', fontSize: '0.65rem' }}>{member.weight_class || ""}</div>
                                        </div>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
