"use client";

import Link from "next/link";
import styles from "./page.module.css";

import { useMode } from "@/components/providers/ModeProvider";

export default function Home() {
    const { isManagerMode } = useMode();

    if (isManagerMode) {
        return (
            <main className={styles.container}>
                <header className={styles.intro}>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>서울 복싱 (김관장)님,<br />환영합니다! 🥊</h1>
                    <p>오늘도 파이팅 넘치는 하루 되세요.</p>
                </header>

                <div className={styles.cardGrid}>
                    <Link href="/matches?emergency=true" id="btn-emergency-match" className={styles.entryCard} style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B' }}>
                        <div className={styles.icon} style={{ background: '#FECACA', color: '#7F1D1D' }}>🚨</div>
                        <h2 className={styles.cardTitle}>긴급 시합 찾기</h2>
                        <p className={styles.cardDesc}>2주 이내 시합 가능한 매치</p>
                    </Link>

                    <div style={{ marginTop: '1rem', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontWeight: 'bold' }}>내 팀 (My Team)</h3>
                            <span style={{ fontSize: '0.9rem', color: '#6B7280' }}>0승 0패</span>
                        </div>
                        <div style={{ height: '80px', background: '#F3F4F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                            팀 로고 등록
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>내 선수 (My Roster)</h3>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                            {/* Mock Player Card 1 */}
                            <div style={{ minWidth: '160px', padding: '1rem', background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E5E7EB', marginBottom: '0.5rem' }}></div>
                                <div style={{ fontWeight: 'bold' }}>강펀치</div>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>6승 2패 • 라이트급</div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#166534', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>🟢 시합 대기</div>
                            </div>
                            {/* Mock Player Card 2 */}
                            <div style={{ minWidth: '160px', padding: '1rem', background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E5E7EB', marginBottom: '0.5rem' }}></div>
                                <div style={{ fontWeight: 'bold' }}>김위빙</div>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>2승 0패 • 웰터급</div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#92400E', background: '#FEF3C7', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>🟠 감량 중</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.container}>
            <header className={styles.intro}>
                <h1>어떤 상대를<br /><strong>찾으시나요?</strong></h1>
                <p>원하는 매칭 유형을 선택하세요.</p>
            </header>

            <div className={styles.cardGrid}>
                {/* 1. Solo Match */}
                <Link href="/select-sport?mode=SOLO" className={`${styles.entryCard} ${styles.solo}`}>
                    <div className={styles.icon}>🥊</div>
                    <h2 className={styles.cardTitle}>1:1 대결 (Sparring)</h2>
                    <p className={styles.cardDesc}>
                        개인 실력 겨루기<br />
                        (프로/아마추어)
                    </p>
                </Link>

                {/* 2. Team Match */}
                <Link href="/select-sport?mode=TEAM" className={`${styles.entryCard} ${styles.team}`}>
                    <div className={styles.icon}>🛡️</div>
                    <h2 className={styles.cardTitle}>팀 대항전 (Club)</h2>
                    <p className={styles.cardDesc}>
                        우리 팀의 실력 증명<br />
                        (전적 기록)
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#B45309', background: '#FEF3C7', padding: '4px 8px', borderRadius: '4px' }}>
                        💡 경기 등록 시 팀 조끼 증정!
                    </div>
                </Link>

                {/* 3. Guest Market */}
                <Link href="/select-sport?mode=GUEST" className={styles.entryCard} style={{ borderColor: '#D1D5DB' }}>
                    <div className={styles.icon} style={{ background: '#F3F4F6', color: '#4B5563' }}>👟</div>
                    <h2 className={styles.cardTitle}>용병 마켓 (Guest)</h2>
                    <p className={styles.cardDesc}>
                        팀원이 부족한가요?<br />
                        용병 구인 / 지원
                    </p>
                </Link>
            </div>
        </main>
    );
}
