"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { useSearchParams } from "next/navigation";
import { useMode } from "@/components/providers/ModeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";
import { sportConfig } from "@/lib/sportConfig";
import { useEffect, useState, Suspense } from "react";

interface Match {
  id: string;
  sport_type: string | null;
  match_date: string | null;
  match_location: string | null;
  status: string | null;

  // New Columns (Refactored from attributes)
  match_weight?: number | null;
  match_type?: string | null; // e.g. Sparring Intensity
  rounds?: string | null;
  gear?: string | null;

  // Relations
  home_player_id?: string | null;
  home_team_id?: string | null;

  // Joined Data
  home_player?: {
    name: string;
    avatar_url: string | null;
    weight_class: string | null;
    team?: {
      team_name: string;
      location?: string;
    } | null;
  } | null;
  home_team?: {
    team_name: string;
    emblem_url: string | null;
    location?: string;
  } | null;

  // User
  host_user_id?: string | null;
  author_id?: string | null;

  attributes: string | null; // Kept for legacy compatibility if needed
  created_at: string;
  match_applications?: { count: number }[];
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
  // Use host_user_id
  const ownerId = match.host_user_id;
  const isMyMatch = currentUser && ownerId === currentUser.id;

  // 1. Dynamic Specs (Summary Details)
  // Logic: Prefer new columns. If new columns are empty/null, fallback to attributes for legacy support.
  let displayData: any = {};

  if (match.match_weight || match.match_type || match.rounds || match.gear) {
    // Use new columns
    // Map back to sportConfig keys if needed. 
    // Assuming sportConfig keys are 'weight', 'type', 'rounds', 'gear'
    displayData = {
      weight: match.match_weight,
      type: match.match_type,
      rounds: match.rounds,
      gear: match.gear
    };
  } else {
    // Fallback to legacy attributes
    try {
      if (match.attributes) {
        displayData = typeof match.attributes === 'string'
          ? JSON.parse(match.attributes)
          : match.attributes;
      }
    } catch (e) { }
  }

  const summaryDetails = sportDef?.fields
    ?.filter((f: any) => displayData[f.key])
    .map((f: any) => `${displayData[f.key]}${f.unit || ''}`)
    .join(' · ');

  // 2. Date Logic
  const targetDate = match.match_date ? new Date(match.match_date) : new Date(match.created_at);
  const dateStr = targetDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = targetDate.getHours() > 0 ? `${targetDate.getHours()}:00` : '시간 미정';

  // 3. Location Logic
  const locString = match.match_location || '장소 미정';

  // 4. Display Logic (Team vs Player)
  const isTeamMatch = !!match.home_team_id;
  const displayName = isTeamMatch ? match.home_team?.team_name : match.home_player?.name;
  const displayImage = isTeamMatch ? match.home_team?.emblem_url : match.home_player?.avatar_url;

  const appCount = match.match_applications?.[0]?.count || 0;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
      {/* Card Content */}
      <div
        style={{
          background: isMyMatch ? '#F8FAFC' : 'white',
          padding: '1.25rem',
          borderRadius: '16px',
          border: isMyMatch ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
          position: 'relative',
          display: 'flex', flexDirection: 'column', gap: '8px'
        }}
      >
        {isMyMatch && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            display: 'flex', gap: '8px', zIndex: 20
          }}>
            <span style={{
              background: '#EFF6FF', color: '#2563EB', fontSize: '0.7rem', fontWeight: 'bold',
              padding: '2px 8px', borderRadius: '6px', border: '1px solid #BFDBFE',
              display: 'flex', alignItems: 'center'
            }}>
              내 매치
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(match.id);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer',
                border: '1px solid #FECACA', borderRadius: '50%',
                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: '#EF4444'
              }}
            >
              🗑️
            </button>
          </div>
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
          {isMyMatch
            ? `신청자 관리 (${appCount}명 신청 중)`
            : isManagerMode
              ? "시합 수락하기 (Accept)"
              : `신청하기 (${appCount}명 신청 중)`}
        </button>
      </div>
    </div>
  );
}

function MatchesContent() {
  const router = useRouter();
  const { isManagerMode } = useMode();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Get context from URL or default
  const sport = searchParams.get('sport') || 'BOXING';
  const mode = searchParams.get('mode') || 'SOLO';

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
    const { data, error } = await supabase
      .from('matches')
      .select('*, home_player:players!home_player_id(*, team:teams!players_team_id_fkey(*)), home_team:teams!home_team_id(team_name, emblem_url, location), host_user_id, match_applications(count)')
      .eq('sport_type', sport) // Filter by sport_type
      .neq('status', 'DELETED') // 삭제된 것(DELETED)만 아니면 모두 조회
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
      throw error;
    }

    console.log('🔥 Fetched Matches:', data);
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
      router.push(`/matches/${matchId}/apply`);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("정말 이 매칭을 삭제하시겠습니까?")) return;

    // 1. Optimistic Update (Immediate Feedback)
    await mutate(
      ['matches', sport, mode],
      (currentMatches: Match[] | undefined) => {
        return currentMatches ? currentMatches.filter(m => m.id !== matchId) : [];
      },
      false
    );

    // 2. Execute Delete (Soft Delete)
    const { error } = await supabase
      .from('matches')
      .update({ status: 'DELETED' }) // Soft delete
      .eq('id', matchId);

    if (error) {
      alert("삭제 실패: " + error.message);
      // Revert / Revalidate on error
      mutate(['matches', sport, mode]);
    } else {
      // [System Message] Notify chat rooms about deletion
      // Find chat rooms associated with this match
      const { data: chatRooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('match_id', matchId);

      if (chatRooms && chatRooms.length > 0) {
        // Insert system message for each room
        // We need current user ID (available in 'currentUser')
        const myId = currentUser?.id;
        if (myId) {
          const systemMessages = chatRooms.map(room => ({
            chat_room_id: room.id,
            sender_id: myId,
            content: "system:::match_deleted"
          }));
          await supabase.from('messages').insert(systemMessages);
        }
      }

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
