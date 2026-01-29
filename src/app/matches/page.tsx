"use client";

import Link from "next/link";
import useSWR, { mutate } from "swr";
import { useSearchParams } from "next/navigation";
import { useMode } from "@/components/providers/ModeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";
import { sportConfig } from "@/lib/sportConfig";
import { useEffect, useState, Suspense } from "react";

interface Match {
  id: string;
  sport_type: string | null; // Changed from sport
  match_date: string | null; // Changed from date
  match_location: string | null;
  status: string | null;

  // Relations
  home_player_id?: string | null;
  home_team_id?: string | null;

  // Joined Data
  home_player?: {
    name: string;
    avatar_url: string | null;
    weight_class: string | null;
  } | null;
  home_team?: {
    team_name: string;
    emblem_url: string | null;
  } | null;

  // User
  host_user_id?: string | null;
  author_id?: string | null;

  attributes: string | null; // JSON string
  created_at: string;
}

// Sub-component for Swipe logic
function MatchCardItem({ match, currentUser, isManagerMode, onDelete, handleAction, sportDef }: {
  match: Match;
  currentUser: any;
  isManagerMode: boolean;
  onDelete: (id: string) => void;
  handleAction: (id: string) => void;
  sportDef: any;
}) {
  // Use host_user_id or author_id
  const ownerId = match.host_user_id || match.author_id;
  const isMyMatch = currentUser && ownerId === currentUser.id;
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);

  // Parsing attributes
  let attrs: any = {};
  try {
    if (match.attributes) {
      attrs = typeof match.attributes === 'string'
        ? JSON.parse(match.attributes)
        : match.attributes;
    }
  } catch (e) { }

  // 1. Dynamic Specs (Summary Details)
  const summaryDetails = sportDef?.fields
    ?.filter((f: any) => attrs[f.key])
    .map((f: any) => `${attrs[f.key]}${f.unit || ''}`)
    .join(' · ');

  // 2. Date Logic
  const targetDate = match.match_date ? new Date(match.match_date) : new Date(match.created_at);
  const dateStr = targetDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = targetDate.getHours() > 0 ? `${targetDate.getHours()}:00` : '시간 미정';

  // 3. Location Logic ("🏠 내 체육관 (Home)")
  let locString = match.match_location || '장소 미정';
  // Add icon if missing (simple heuristic)
  if (!locString.includes('🏠') && !locString.includes('✈️') && !locString.includes('🤝')) {
    if (locString.includes('Home')) locString = `🏠 ${locString}`;
    else if (locString.includes('Away')) locString = `✈️ ${locString}`;
    else if (locString.includes('협의') || locString.includes('TBD')) locString = `🤝 ${locString}`;
  }

  // 4. Display Logic (Team vs Player)
  const isTeamMatch = !!match.home_team_id;
  const displayName = isTeamMatch ? match.home_team?.team_name : match.home_player?.name;
  const displayImage = isTeamMatch ? match.home_team?.emblem_url : match.home_player?.avatar_url;

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMyMatch) return;
    setStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMyMatch) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - startX;

    // If swiping left (diff < 0)
    if (diff < 0) {
      // Limit slide to -80px
      if (diff > -80) setTranslateX(diff);
      else setTranslateX(-80);
    } else {
      // Swiping right (closing)
      if (isSwiped) {
        const newX = -80 + diff;
        if (newX > 0) setTranslateX(0);
        else setTranslateX(newX);
      } else {
        setTranslateX(0);
      }
    }
  };

  const onTouchEnd = () => {
    if (!isMyMatch) return;
    if (translateX < -50) {
      setTranslateX(-80);
      setIsSwiped(true);
    } else {
      setTranslateX(0);
      setIsSwiped(false);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
      {/* Bottom Layer (Delete Button) */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: '100%',
        background: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: '26px', borderRadius: '16px',
      }}>
        <button onClick={() => onDelete(match.id)} style={{ fontSize: '1.5rem', background: 'transparent', border: 'none', color: 'white' }}>
          🗑️
        </button>
      </div>

      {/* Top Layer (Card Content) */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          background: isMyMatch ? '#F8FAFC' : 'white',
          padding: '1.25rem',
          borderRadius: '16px',
          border: isMyMatch ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
          position: 'relative',
          transform: `translateX(${translateX}px)`,
          transition: 'transform 0.3s ease-out',
          zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: '8px'
        }}
      >
        {isMyMatch && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            background: '#EFF6FF', color: '#2563EB', fontSize: '0.7rem', fontWeight: 'bold',
            padding: '2px 8px', borderRadius: '6px', border: '1px solid #BFDBFE'
          }}>내 매치</div>
        )}

        {/* Header: Date & Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#111827' }}>
            {dateStr} <span style={{ color: '#4B5563', fontWeight: 'normal' }}>{timeStr}</span>
          </span>
        </div>
        {/* Location */}
        <div style={{ fontSize: '0.9rem', color: '#4B5563', marginTop: '-4px' }}>
          {locString}
        </div>

        {/* Dynamic Warning: If incompatible */}
        {(!match.home_player && !match.home_team) && (
          <div style={{ fontSize: '0.75rem', color: 'red' }}>⚠️ 데이터 로드 실패 (ID 연결 오류)</div>
        )}

        {/* Divider */}
        <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />

        {/* Main Info: Image + Name + Specs */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '4px' }}>
          {/* Avatar / Emblem */}
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden',
            background: '#F3F4F6', border: '1px solid #E5E7EB', flexShrink: 0
          }}>
            {displayImage ? (
              <img src={displayImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                {isTeamMatch ? '🛡️' : '👤'}
              </div>
            )}
          </div>

          {/* Texts */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1F2937' }}>
              {displayName || '이름 없음'}
            </div>

            {/* Detailed Specs (Summary Style) */}
            <div style={{
              fontSize: '0.85rem', color: '#4B5563', marginTop: '4px', lineHeight: '1.4',
              background: '#F9FAFB', padding: '6px 10px', borderRadius: '8px', display: 'inline-block'
            }}>
              {summaryDetails || <span style={{ color: '#9CA3AF' }}>상세 정보 없음</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => handleAction(match.id)}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '8px', marginTop: '8px',
            background: isManagerMode ? '#1F2937' : '#2563EB', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {isManagerMode ? "시합 수락하기 (Accept)" : "신청하기 (Apply)"}
        </button>
      </div>
    </div>
  );
}

// ... (Rest of component unchanged until fetchMatches) ...

function MatchesContent() {
  const { isManagerMode } = useMode();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get context from URL or default
  const sport = searchParams.get('sport') || 'BOXING';
  const mode = searchParams.get('mode') || 'SOLO';

  // Helper for sport display
  // ... (Keep existing getSportName) ... (I need to keep the context lines in view or copy them if replacing block)

  // (Assuming context is sufficient or I replace fetchMatches block mainly)
  // I will assume I need to replace the whole MatchCardItem + Interfaces + Fetcher section.
  // BUT the replacement range is huge. I should be careful.

  /* I will include MatchesContent skeleton to target correctly */

  const getSportName = (s: string) => {
    if (s === 'BOXING') return '복싱';
    if (s === 'SOCCER') return '축구/풋살';
    if (s === 'JIUJITSU') return '주짓수';
    // ... others
    return s;
  };
  const sportName = getSportName(sport);
  const sportDef = sportConfig[mode]?.[sport];

  // Fetcher
  const fetchMatches = async () => {
    // New Logic: Use sport_type, status='SCHEDULED', join players/teams
    // Explicitly hint the join column using correct FK name matches_home_player_id_fkey and matches_home_team_id_fkey
    const { data, error } = await supabase
      .from('matches')
      .select('*, home_player:players!matches_home_player_id_fkey(name, avatar_url, weight_class), home_team:teams!matches_home_team_id_fkey(team_name, emblem_url), host_user_id:author_id')
      .eq('sport_type', sport) // Filter by sport_type
      .in('status', ['OPEN', 'SCHEDULED']) // Query both OPEN and SCHEDULED
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
      throw error;
    }
    return data as unknown as Match[];
  };
  const { data: matches, error, isLoading } = useSWR<Match[]>(
    ['matches', sport, mode], // Key depends on filters
    fetchMatches,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true
    }
  );

  // User State for Badge
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Force refresh on mount to ensure fresh data after adding
  useEffect(() => {
    mutate(['matches', sport, mode]);

    // Fetch User for Badge logic
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, [sport, mode]);

  const handleAction = (matchId: string) => {
    if (isManagerMode) {
      showToast("매칭이 수락되었습니다! (채팅방 생성)", "success");
      // Here we would actually call an API to update status
    } else {
      showToast("신청이 완료되었습니다! (선수에게 알림)", "success");
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("정말 이 매칭을 삭제하시겠습니까?")) return;

    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      showToast("매칭이 삭제되었습니다.", "success");
      mutate(['matches', sport, mode]);
    }
  };

  return (
    <main style={{ padding: '1.5rem', paddingBottom: '6rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {isManagerMode ? "받은 신청 (Inbox)" : `${sportDef?.icon || ''} ${sportName} 매칭 찾기`}
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            {isManagerMode ? "체육관으로 들어온 스파링 제안" : "지금 참여 가능한 스파링"}
          </p>
        </div>
        {!isManagerMode && (
          <Link href={`/matches/new?sport=${sport}&mode=${mode}`} style={{ fontSize: '1.5rem', background: '#EFF6FF', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            ➕
          </Link>
        )}
      </header>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading Feed...</div>
      ) : !matches || matches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '16px', border: '1px dashed #E5E7EB' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
          <h3>등록된 매칭이 없습니다.</h3>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>첫 번째 대결을 주선해보세요!</p>
          <Link href={`/matches/new?sport=${sport}&mode=${mode}`} style={{ background: '#2563EB', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>
            매칭 등록하기
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {matches.map((match) => (
            <MatchCardItem
              key={match.id}
              match={match}
              currentUser={currentUser}
              isManagerMode={isManagerMode}
              onDelete={handleDelete}
              handleAction={handleAction}
              sportDef={sportDef}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>목록 로딩 중...</div>}>
      <MatchesContent />
    </Suspense>
  );
}
