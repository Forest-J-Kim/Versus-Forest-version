"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function SelectSportPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get('mode') || 'SOLO';

    const handleSportSelect = (sportId: string) => {
        router.push(`/matches/new?mode=${mode}&sport=${sportId}`);
    };

    return (
        <main style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <Link href="/" style={{ textDecoration: 'none', color: '#6B7280', marginBottom: '1rem', display: 'block' }}>← 뒤로가기</Link>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                    {mode === 'SOLO' ? '1:1 종목 선택' : '팀 종목 선택'}
                </h1>
                <p style={{ color: '#4B5563' }}>
                    {mode === 'SOLO' ? '개인 실력을 증명할 종목을 고르세요.' : '팀의 명예를 걸고 싸울 종목입니다.'}
                </p>
            </header>

            {mode === 'SOLO' ? (
                <>
                    {/* Section 1: Combat Sports */}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#DC2626' }}>🔥 격투 스포츠 (Combat)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        <SportButton icon="🥊" title="복싱" sub="Boxing" onClick={() => handleSportSelect('BOXING')} />
                        <SportButton icon="🦵" title="킥복싱/MT" sub="Kickboxing" onClick={() => handleSportSelect('KICKBOXING')} />
                        <SportButton icon="🤼" title="MMA" sub="Mixed Martial Arts" onClick={() => handleSportSelect('MMA')} />
                        <SportButton icon="🥋" title="유도/주짓수" sub="Grappling" onClick={() => handleSportSelect('JIUJITSU')} />
                        <SportButton icon="🥋" title="태권도" sub="Taekwondo" onClick={() => handleSportSelect('TAEKWONDO')} />
                    </div>

                    {/* Section 2: Individual Sports */}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563EB' }}>🏃 개인 스포츠 (Individual)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <SportButton icon="🎾" title="테니스" sub="Tennis" onClick={() => handleSportSelect('TENNIS')} />
                        <SportButton icon="🏸" title="배드민턴" sub="Badminton" onClick={() => handleSportSelect('BADMINTON')} />
                        <SportButton icon="🏓" title="탁구" sub="Table Tennis" onClick={() => handleSportSelect('PINGPONG')} />
                        <SportButton icon="🏋️" title="헬스/크로스핏" sub="Fitness" onClick={() => handleSportSelect('FITNESS')} />
                    </div>
                </>
            ) : (
                <>
                    {/* Team Sports Only */}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#059669' }}>⚽ 구기 종목 (Ball Games)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <SportButton icon="⚽" title="축구/풋살" sub="Soccer" onClick={() => handleSportSelect('SOCCER')} />
                        <SportButton icon="🏀" title="농구" sub="Basketball" onClick={() => handleSportSelect('BASKETBALL')} />
                        <SportButton icon="⚾" title="야구" sub="Baseball" onClick={() => handleSportSelect('BASEBALL')} />
                        <SportButton icon="🏐" title="배구/족구" sub="Volleyball" onClick={() => handleSportSelect('VOLLEYBALL')} />
                    </div>
                </>
            )}

            <div style={{ marginTop: '2rem', background: '#FEF2F2', padding: '1rem', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#991B1B', marginBottom: '4px' }}>🚨 안전 주의사항</h3>
                <p style={{ fontSize: '0.8rem', color: '#B91C1C' }}>
                    스포츠 정신에 위배되는 폭력적인 만남이나 불법 행위 적발 시, 서비스 이용이 <strong>영구 제재</strong>됩니다. 안전하고 매너 있는 경기를 부탁드립니다.
                </p>
            </div>
        </main>
    );
}

function SportButton({ icon, title, sub, onClick }: { icon: string, title: string, sub: string, onClick: () => void }) {
    return (
        <button onClick={onClick} style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', border: '1px solid #E5E7EB', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>{icon}</div>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{title}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{sub}</div>
        </button>
    )
}
