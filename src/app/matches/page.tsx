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
  description?: string | null;
  tags?: string[] | null;
  match_format?: string | null;
  team_level?: number | null;
  match_mode?: 'HOME' | 'AWAY' | 'NEUTRAL' | string | null;

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
    description?: string | null;
  } | null;

  // User
  host_user_id?: string | null;
  author_id?: string | null;

  attributes: string | null; // Kept for legacy compatibility if needed
  created_at: string;
  match_applications?: { count: number; applicant_user_id?: string; applicant_player_id?: string; status?: string }[];
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
  const router = useRouter();
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
      rounds: match.rounds ? String(match.rounds).replace(/R/i, '') + 'R' : undefined,
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

  // 4. Display Logic (Always Player - Per Request)
  const isTeamMatch = !!match.home_team_id;
  const displayName = match.home_player?.name || "알 수 없음";
  const displayImage = match.home_player?.avatar_url;

  const appCount = match.match_applications?.length || 0;

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

        {/* --- Team Sport UI --- */}
        {(() => {
          // Check if Team Sport
          // Check if Team Sport (Robust: UpperCase)
          const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
          const currentSport = (match.sport_type || sportDef?.id || '').toUpperCase();
          const isTeamSport = TEAM_SPORTS.includes(currentSport);

          if (!isTeamSport) {
            // [Generic UI] Original Implementation
            return (
              <>
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

                {/* Divider */}
                <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />

                {/* Main Info: Image + Name + Specs */}
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '4px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (match.home_player_id) router.push(`/player/${match.home_player_id}`);
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden',
                    background: '#F3F4F6', border: '1px solid #E5E7EB', flexShrink: 0
                  }}>
                    {displayImage ? (
                      <img src={displayImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                        👤
                      </div>
                    )}
                  </div>
                  {/* Texts */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1F2937' }}>
                      {displayName || '이름 없음'}
                    </div>
                    {/* Specs */}
                    <div style={{
                      fontSize: '0.85rem', color: '#4B5563', marginTop: '4px', lineHeight: '1.4',
                      background: '#F9FAFB', padding: '6px 10px', borderRadius: '8px', display: 'inline-block'
                    }}>
                      {summaryDetails || <span style={{ color: '#9CA3AF' }}>상세 정보 없음</span>}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {match.tags && match.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {match.tags.map(tag => (
                      <span key={tag} style={{
                        background: '#F3F4F6', color: '#4B5563', fontSize: '0.75rem',
                        padding: '4px 8px', borderRadius: '6px', fontWeight: '500'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            );
          }

          // [Team Sport UI] New Implementation
          // 1. Clean Location Logic
          let cleanLocation = locString;
          // [Refined Logic] If Team Sport + HOME Match -> Use raw address from team table to avoid duplication
          if (isTeamSport && match.match_mode === 'HOME' && match.home_team?.location) {
            cleanLocation = match.home_team.location;
          } else {
            // Fallback: Remove emojis if present in typical format
            cleanLocation = cleanLocation.replace(/^[\u{1F300}-\u{1F9FF}] /u, '');
          }

          // 2. Team Profile
          const teamName = match.home_team?.team_name || "알 수 없는 팀";
          const teamEmblem = match.home_team?.emblem_url;
          const captainName = match.home_player?.name || "주장 미정";

          // 3. Badges Processing
          // Level Text Map
          const LEVEL_MAP: Record<number, string> = {
            1: "🐣 Lv.1 병아리",
            2: "🏃 Lv.2 동네 에이스",
            3: "🎖️ Lv.3 지역구 강자",
            4: "🏆 Lv.4 전국구 고수",
            5: "👽 Lv.5 우주방위대"
          };
          const levelText = match.team_level ? LEVEL_MAP[match.team_level] : null;

          return (
            <>
              {/* [1] Date & Time (Generic Style Reverted) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#111827' }}>
                  {dateStr} <span style={{ color: '#4B5563', fontWeight: 'normal' }}>{timeStr}</span>
                </span>
              </div>

              {/* [2] Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '-4px' }}>
                <span style={{ fontSize: '0.85rem' }}>📍</span>
                <span style={{ fontSize: '0.9rem', color: '#4B5563', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {cleanLocation}
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />

              {/* [3] Team Profile */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (match.home_team_id) router.push(`/team/${match.home_team_id}`);
                }}
              >
                {/* Emblem */}
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%', // Circle & Larger
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {teamEmblem ? (
                    <img src={teamEmblem} alt="Team" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                  )}
                </div>

                {/* Texts */}
                <div style={{ flex: 1 }}>
                  {/* Row 1: Team Name */}
                  <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#111827' }}>
                    {teamName}
                  </div>
                  {/* Row 2: Captain */}
                  <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '2px' }}>
                    주장: {captainName}
                  </div>
                  {/* Row 3: Team Intro (One-liner from DB) */}
                  {match.home_team?.description && (
                    <div style={{
                      fontSize: '0.8rem', color: '#9CA3AF', marginTop: '4px',
                      display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {match.home_team.description}
                    </div>
                  )}
                </div>
              </div>

              {/* [4] Badges (Format, Level, Tags) */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                {/* Badge 1: Format */}
                {match.match_format && (
                  <span style={{
                    background: '#EFF6FF', color: '#2563EB', fontSize: '0.75rem',
                    padding: '4px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid #BFDBFE'
                  }}>
                    {match.match_format}
                  </span>
                )}

                {/* Badge 2: Level */}
                {levelText && (
                  <span style={{
                    background: '#FFF7ED', color: '#C2410C', fontSize: '0.75rem',
                    padding: '4px 8px', borderRadius: '6px', fontWeight: '600', border: '1px solid #FED7AA'
                  }}>
                    {levelText}
                  </span>
                )}

                {/* Badge 3+: Tags (Limit 2) */}
                {match.tags && match.tags.slice(0, 2).map(tag => (
                  <span key={tag} style={{
                    background: '#F3F4F6', color: '#4B5563', fontSize: '0.75rem',
                    padding: '4px 8px', borderRadius: '6px', fontWeight: '500'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </>
          );
        })()}

        {/* Actions */}

        {/* Actions - Case Logic */}
        {(() => {
          const isScheduled = match.status === 'SCHEDULED';
          const isCompleted = match.status === 'COMPLETED';

          // My Application Status (Sync by User ID OR Player ID for Captain Proxy Apply)
          // Robust check: explicitly look for ACCEPTED status first
          const isAcceptedApplicant = match.match_applications?.some(app =>
            ((app.applicant_user_id === currentUser?.id) ||
              (currentUser?.myPlayerIds?.includes(app.applicant_player_id))) &&
            app.status === 'ACCEPTED'
          );

          // Find specific app for other states (Pending/Rejected) - Prioritize Pending if not Accepted
          const myApp = match.match_applications?.find(app =>
            (app.applicant_user_id === currentUser?.id) ||
            (currentUser?.myPlayerIds?.includes(app.applicant_player_id))
          );

          // 1. Host Logic (Top Priority)
          if (isMyMatch) {
            if (isScheduled) {
              return (
                <button
                  onClick={() => handleAction(match.id)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', marginTop: '8px',
                    background: '#22C55E', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  매칭 성사됨 (상세정보)
                </button>
              );
            } else {
              // Host + Pending (Manage)
              return (
                <button
                  onClick={() => handleAction(match.id)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', marginTop: '8px',
                    background: '#FEF3C7', color: '#D97706', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  신청자 관리 ({appCount}명 신청 중)
                </button>
              );
            }
          }

          // 2. Accepted Applicant + Scheduled
          if (isAcceptedApplicant && isScheduled) {
            return (
              <button
                onClick={() => handleAction(match.id)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '8px', marginTop: '8px',
                  background: '#22C55E', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                매칭 수락됨 (상세정보)
              </button>
            );
          }

          // 3. Other + Scheduled or Completed
          if (isScheduled || isCompleted) {
            return (
              <button
                disabled
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '8px', marginTop: '8px',
                  background: '#9CA3AF', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'not-allowed',
                  boxShadow: 'none'
                }}
              >
                매칭 완료
              </button>
            );
          }

          // 4. Pending Logic (General User)
          if (myApp?.status === 'PENDING' && !isManagerMode) {
            return (
              <button
                onClick={(e) => { e.stopPropagation(); router.push('/matches/' + match.id); }}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '8px', marginTop: '8px',
                  background: '#FEF3C7', color: '#D97706', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                신청 대기중... (현재 {appCount}명 신청)
              </button>
            );
          }

          // 5. Guest + Pending (Default)
          return (
            <button
              onClick={(e) => { e.stopPropagation(); router.push('/matches/' + match.id + '/apply'); }}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', marginTop: '8px',
                background: isManagerMode ? '#1F2937' : '#2563EB', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {isManagerMode
                ? "시합 수락하기 (Accept)"
                : `신청하기 (${appCount}명 신청 중)`}
            </button>
          );
        })()}
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
      .select('*, home_player:players!home_player_id(*, team:teams!players_team_id_fkey(*)), home_team:teams!home_team_id(team_name, emblem_url, location, description), host_user_id, match_applications(applicant_user_id, applicant_player_id, status)')
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
      if (user) {
        // [Added] Fetch my player IDs to sync application status
        const { data: ps } = await supabase.from('players').select('id').eq('user_id', user.id);
        const pIds = ps?.map(p => p.id) || [];
        setCurrentUser({ ...user, myPlayerIds: pIds });
      } else {
        setCurrentUser(null);
      }
    };
    getUser();
  }, [sport, mode]);

  const handleAction = (matchId: string) => {
    // Both Manager and Player/Host should go to detail page
    // The detail page handles the "Chat" or "Accept" logic
    router.push(`/matches/${matchId}`);
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("정말 이 매칭을 삭제하시겠습니까? (상대방에게 취소 알림이 전송됩니다)")) return;

    // 1. [New] 알림 발송 로직 추가 (삭제 전 실행)
    const { data: targetApp } = await supabase
      .from('match_applications')
      .select('applicant_user_id')
      .eq('match_id', matchId)
      .eq('status', 'ACCEPTED')
      .maybeSingle();

    if (targetApp) {
      // 리스트에서 매치 정보 찾기
      const targetMatch = matches?.find(m => m.id === matchId);

      // 1. 종목명 한글 매핑
      const SPORT_LABELS: Record<string, string> = {
        BOXING: "🥊 복싱", SOCCER: "⚽ 축구", BASEBALL: "⚾ 야구",
        BASKETBALL: "🏀 농구", BADMINTON: "🏸 배드민턴", TENNIS: "🎾 테니스",
        VOLLEYBALL: "🏐 배구", PINGPONG: "🏓 탁구",
        MMA: "🤼 MMA", JIUJITSU: "🥋 주짓수", KICKBOXING: "🦵 킥복싱", WRESTLING: "🤼 레슬링", MUAYTHAI: "🥊 무에타이",
        FUTSAL: "⚽ 풋살"
      };
      const sType = targetMatch?.sport_type || '';
      const displayTitle = SPORT_LABELS[sType] || sType || '매치';

      // 2. 호스트 닉네임 추출 (Player 정보 우선)
      const hostNickname = targetMatch?.home_player?.name
        || "알 수 없는 호스트";

      await supabase.from('notifications').insert({
        receiver_id: targetApp.applicant_user_id,
        type: 'MATCH_CANCEL',
        content: `${hostNickname}님의 사정으로 매치가 취소되었습니다.`,
        redirect_url: '/matches',
        is_read: false,
        metadata: {
          type: "MATCH_CANCEL",
          match_title: displayTitle,
          applicant_name: hostNickname,
          message: "매치가 삭제되었습니다.",
          request_date: new Date().toISOString()
        }
      });
    }

    // 2. Optimistic Update (Immediate Feedback)
    await mutate(
      ['matches', sport, mode],
      (currentMatches: Match[] | undefined) => {
        return currentMatches ? currentMatches.filter(m => m.id !== matchId) : [];
      },
      false
    );

    // 3. Execute Delete (Soft Delete)
    const { error } = await supabase
      .from('matches')
      .update({ status: 'DELETED' }) // Soft delete
      .eq('id', matchId);

    if (error) {
      alert("삭제 실패: " + error.message);
      // Revert / Revalidate on error
      mutate(['matches', sport, mode]);
    } else {
      // 4. [System Message] Notify chat rooms about deletion
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

      showToast("매칭이 취소(삭제)되었습니다.", "success");
      mutate(['matches', sport, mode]);
    }
  };

  // Dynamic Terminology
  const FIGHTING_SPORTS = ['BOXING', 'MMA', 'KICKBOXING'];
  const isFighting = FIGHTING_SPORTS.includes(sport.toUpperCase());
  const matchTerm = isFighting ? '스파링' : '매치';

  return (
    <main style={{ padding: '1.5rem', paddingBottom: '6rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {isManagerMode ? "받은 신청 (Inbox)" : `${sportDef?.icon || ''} ${sportName} 매칭 찾기`}
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            {isManagerMode ? "체육관으로 들어온 스파링 제안" : `지금 참여 가능한 ${matchTerm}`}
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
          <h3>등록된 {matchTerm}가 없습니다.</h3>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>첫 번째 {matchTerm}를 주선해보세요!</p>
          <Link href={`/matches/new?sport=${sport}&mode=${mode}`} style={{ background: '#2563EB', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>
            {matchTerm} 등록하기
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
