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
  mode: string;
  sport: string;
  date: string;     // Changed from target_date
  location: string;
  hostUserId: string;
  attributes: string; // JSON string
  createdAt: string;
  status: string;
  type: string;
}

// Sub-component for Swipe logic
function MatchCardItem({ match, currentUser, isManagerMode, onDelete, handleAction }: {
  match: Match;
  currentUser: any;
  isManagerMode: boolean;
  onDelete: (id: string) => void;
  handleAction: (id: string) => void;
}) {
  const isMyMatch = currentUser && match.hostUserId === currentUser.id;
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);

  // Parsing attributes
  let attrs: any = {};
  try {
    attrs = typeof match.attributes === 'string'
      ? JSON.parse(match.attributes)
      : match.attributes;
  } catch (e) { }

  const { weight, rounds, intensity, level } = attrs;
  const matchDate = new Date(match.date);
  const dateStr = matchDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = matchDate.getHours() > 0 ? `${matchDate.getHours()}:00` : '시간 미정';

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
        // If already swiped open, and moving right, reduce negative translation toward 0
        // Current position is -80, diff is positive.
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

    // Threshold check (e.g., more than -50px)
    if (translateX < -50) {
      setTranslateX(-80);
      setIsSwiped(true);
    } else {
      setTranslateX(0);
      setIsSwiped(false);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
      {/* Bottom Layer (Delete Button) */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0, right: 0,
        width: '100%',
        background: '#F43F5E', // bg-rose-500
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: '26px',
        borderRadius: '16px',
      }}>
        <button
          onClick={() => onDelete(match.id)}
          style={{ fontSize: '1.5rem', background: 'transparent', border: 'none', color: 'white' }}
        >
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
          zIndex: 10
        }}
      >
        {isMyMatch && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            background: '#EFF6FF', color: '#2563EB', fontSize: '0.7rem', fontWeight: 'bold',
            padding: '2px 8px', borderRadius: '6px', border: '1px solid #BFDBFE'
          }}>내 매치</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {match.location?.includes('Home') ? '🏠' : match.location?.includes('Away') ? '✈️' : match.location?.includes('TBD') ? '🤝' : ''} {match.location || '장소 미정'}
            </span>
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#374151', marginRight: isMyMatch ? '4rem' : '0' }}>
            {dateStr} {timeStr}
          </span>
        </div>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', lineHeight: '1.4' }}>
          {weight ? `${weight}급 ` : ''}
          {intensity ? `${intensity} 스파링` : '스파링'}
        </h3>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {rounds && <span style={{ fontSize: '0.75rem', color: '#4B5563', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>{rounds}</span>}
          {level && <span style={{ fontSize: '0.75rem', color: '#4B5563', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>{level}</span>}
          <span style={{ fontSize: '0.75rem', color: '#4B5563', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
            {match.location?.includes('Home') ? '홈' : match.location?.includes('Away') ? '원정' : '중립'}
          </span>
        </div>

        <button
          onClick={() => handleAction(match.id)}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '8px',
            background: isManagerMode ? '#1F2937' : '#2563EB', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer'
          }}
        >
          {isManagerMode ? "시합 수락하기 (Accept)" : "신청하기 (Apply)"}
        </button>
      </div>
    </div>
  );
}

// ... (MatchCardItem component remains unchanged) ...

function MatchesContent() {
  const { isManagerMode } = useMode();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get context from URL or default
  const sport = searchParams.get('sport') || 'BOXING';
  const mode = searchParams.get('mode') || 'SOLO';

  // Helper for sport display
  const getSportName = (s: string) => {
    if (s === 'BOXING') return '복싱';
    if (s === 'SOCCER') return '축구/풋살';
    if (s === 'JIUJITSU') return '주짓수';
    if (s === 'KICKBOXING') return '킥복싱';
    if (s === 'MMA') return 'MMA';
    if (s === 'FITNESS') return '헬스';
    if (s === 'RUNNING') return '러닝';
    return s;
  };

  const sportName = getSportName(sport);
  const sportDef = sportConfig[mode]?.[sport];

  // Fetcher
  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('sport', sport) // Filter by current sport
      .eq('status', 'OPEN') // Only OPEN matches
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
      throw error;
    }
    return data;
  };

  // Real-time Feed
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
