"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMode } from "@/components/providers/ModeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { supabase } from "@/lib/supabaseClient";

interface Match {
  id: string;
  mode: string;
  sport: string;
  attributes: string; // JSON string
  createdAt: string;
  status: string;
}

// Fetcher
const fetchMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export default function MatchesPage() {
  const { isManagerMode } = useMode();
  const { showToast } = useToast();

  // Real-time Feed (Subscribed via SWR polling or just simple fetch for MVP)
  const { data: matches, error, isLoading } = useSWR<Match[]>('matches', fetchMatches, { refreshInterval: 5000 }); // Auto-refresh every 5s

  const handleAction = (matchId: string) => {
    if (isManagerMode) {
      showToast("매칭이 수락되었습니다! (채팅방 생성)", "success");
      // Here we would actually call an API to update status
    } else {
      showToast("신청이 완료되었습니다! (선수에게 알림)", "success");
    }
  };

  return (
    <main style={{ padding: '1.5rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {isManagerMode ? "받은 신청 (Inbox)" : "매칭 찾기"}
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            {isManagerMode ? "체육관으로 들어온 스파링 제안" : "지금 참여 가능한 스파링"}
          </p>
        </div>
        {!isManagerMode && (
          <Link href="/" style={{ fontSize: '1.5rem', background: '#EFF6FF', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
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
          <Link href="/" style={{ background: '#2563EB', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>
            매칭 등록하기
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {matches.map((match) => {
            // Supabase returns JSON object directly, no need to parse if configured correctly usually,
            // but depending on driver it might be string or object.
            // schema says jsonb, so it should be object.
            const attrs = (typeof match.attributes === 'string'
              ? JSON.parse(match.attributes)
              : match.attributes) as any;

            const { displayDate, weight, type, rounds, tags } = attrs;

            return (
              <div key={match.id} style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: match.mode === 'SOLO' ? '#2563EB' : '#059669', background: match.mode === 'SOLO' ? '#EFF6FF' : '#ECFDF5', padding: '4px 8px', borderRadius: '6px' }}>
                      {match.mode === 'SOLO' ? '개인전' : '단체전'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                      {match.sport === 'BOXING' ? '복싱' : match.sport}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#374151' }}>
                    {displayDate || '날짜미정'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {match.mode === 'SOLO'
                    ? `${weight || '?'}kg급 ${type || ''} 스파링`
                    : `${attrs['format'] || '팀'} 매치 구합니다`
                  }
                </h3>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {tags?.map((t: string) => (
                    <span key={t} style={{ fontSize: '0.75rem', color: '#4B5563', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleAction(match.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: isManagerMode ? '#1F2937' : '#2563EB',
                    color: 'white',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                >
                  {isManagerMode ? "시합 수락하기 (Accept)" : "신청하기 (Apply)"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
