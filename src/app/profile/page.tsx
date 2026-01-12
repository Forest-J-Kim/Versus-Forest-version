"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useMode } from "@/components/providers/ModeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { supabase } from "@/lib/supabaseClient";

// Fetcher for SWR
const fetcher = async () => {
    const { data, error } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export default function ProfilePage() {
    const { isManagerMode, toggleManagerMode } = useMode();
    const { showToast } = useToast();

    // SWR for Real-time Roster
    const { data: roster, error, isLoading } = useSWR(isManagerMode ? 'players' : null, fetcher);

    // MVP Temp ID (String per user request)
    const TEMP_ID = 'manager-1234';

    // Auth & Modal State
    const [isVerified, setIsVerified] = useState(false); // Business Verify Sim
    const [bizNumber, setBizNumber] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        style: 'Orthodox',
        weight: '',
        win: '',
        loss: '',
        draw: '',
        tags: [] as string[], // Multi-sport tags
        position: 'MF' // Soccer specifics
    });

    const handleVerifyBiz = () => {
        if (bizNumber.length !== 10) {
            alert("사업자 번호 10자리를 입력해주세요.");
            return;
        }
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            setIsVerified(true);
            alert("국세청 정보 확인 완료 ✅\n정상 사업자입니다.");
        }, 1500);
    };

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleTag = (tag: string) => {
        setFormData(prev => {
            const exists = prev.tags.includes(tag);
            if (exists) return { ...prev, tags: prev.tags.filter(t => t !== tag) };
            return { ...prev, tags: [...prev.tags, tag] };
        });
    };

    const handleRealSubmit = async () => {
        // Immediate Feedback
        alert("저장 중입니다...");
        console.log("Saving...");

        if (!formData.name) {
            alert("이름은 필수입니다.");
            return;
        }

        // Parse Record
        const win = parseInt(formData.win) || 0;
        const loss = parseInt(formData.loss) || 0;
        const draw = parseInt(formData.draw) || 0;
        const recordString = `${win}승 ${loss}패 ${draw > 0 ? `${draw}무` : ''}`;

        // Construct Payload
        const payload = {
            name: formData.name,
            weight_class: formData.weight,
            record: recordString,
            style: formData.style,
            age: parseInt(formData.age) || null,
            tags: formData.tags, // JSONB
            status: 'active'
            // NO manager_id sent, purely relying on DB default to avoid FK error
        };

        try {
            console.log("Payload:", payload);
            const { error } = await supabase.from('players').insert([payload]);
            if (error) throw error;

            showToast("선수 등록 완료!", "success"); // Toast also good if available, but Alert requested priority
            alert("성공적으로 등록되었습니다! 🚀");
            setIsModalOpen(false);
            setFormData({ name: '', age: '', style: 'Orthodox', weight: '', win: '', loss: '', draw: '', tags: [], position: 'MF' });
            mutate('players');

        } catch (error: any) {
            console.error("Caught Error:", error);
            const errorMsg = error.message || error.details || JSON.stringify(error);
            alert(`등록 실패: ${errorMsg}`);
        }
    };

    // Keep old handleAddPlayer ref for now or remove? User wants "Real Form" replace.
    // We will replace the button's onClick to handleOpenModal


    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("정말 삭제하시겠습니까?")) return;

        const { error } = await supabase.from('players').delete().eq('id', id);

        if (error) {
            showToast("삭제 실패", "error");
        } else {
            showToast("선수가 삭제되었습니다.", "success");
            mutate('players');
        }
    };

    if (isManagerMode) {
        return (
            <main style={{ padding: '1.5rem' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>내 체육관</h1>
                    <p style={{ color: '#6B7280' }}>서울 복싱 (Manager) • Supabase Connected ⚡</p>
                </header>

                {/* --- Business Verification Section --- */}
                {!isVerified ? (
                    <div style={{ background: '#EFF6FF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #BFDBFE', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1E40AF', marginBottom: '0.5rem' }}>👮‍♂️ 사업자 인증이 필요합니다</h3>
                        <p style={{ fontSize: '0.9rem', color: '#1E3A8A', marginBottom: '1rem' }}>안전한 매칭을 위해 체육관 인증을 진행해주세요.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                placeholder="사업자번호 10자리"
                                value={bizNumber}
                                onChange={(e) => setBizNumber(e.target.value)}
                                maxLength={10}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                            />
                            <button
                                onClick={handleVerifyBiz}
                                disabled={isVerifying}
                                style={{ padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', minWidth: '80px' }}
                            >
                                {isVerifying ? '...' : '조회'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ background: '#ECFDF5', padding: '1rem', borderRadius: '12px', border: '1px solid #A7F3D0', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✅</span>
                        <span style={{ fontWeight: 'bold', color: '#065F46' }}>국세청 사업자 인증 완료 (Verified)</span>
                    </div>
                )}

                {/* --- Roster Section --- */}
                <section style={{ marginBottom: '2rem', opacity: isVerified ? 1 : 0.5, pointerEvents: isVerified ? 'auto' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>선수 명단 (Roster)</h2>
                        <button onClick={handleOpenModal} style={{ fontSize: '0.9rem', color: '#2563EB', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>
                            + 선수 추가
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {isLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>Loading Roster...</div>
                        ) : roster?.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', background: '#F9FAFB', borderRadius: '12px' }}>등록된 선수가 없습니다.</div>
                        ) : (
                            roster?.map((player: any) => (
                                <div key={player.id} style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #E5E7EB', position: 'relative' }}>
                                    <div style={{ width: '48px', height: '48px', background: '#F3F4F6', borderRadius: '50%', marginRight: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                        {player.tags?.[0] === 'SOCCER' ? '⚽' : '🥊'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{player.name} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6B7280' }}>({player.age}세)</span></div>
                                        <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                            {player.record} • {player.weight_class}
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                            {player.tags?.map((t: string) => (
                                                <span key={t} style={{ fontSize: '0.7rem', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', color: '#374151' }}>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            onClick={(e) => handleDelete(player.id, e)}
                                            style={{ fontSize: '0.7rem', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <button onClick={toggleManagerMode} style={{ width: '100%', padding: '1rem', background: '#F3F4F6', borderRadius: '12px', color: '#4B5563', fontWeight: 'bold' }}>
                    일반 유저 모드로 돌아가기
                </button>

                {/* --- Smart Player Registration Modal --- */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                        <div style={{ background: 'white', width: '90%', maxWidth: '400px', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>스마트 선수 등록</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <input name="name" placeholder="이름 (Name)" value={formData.name} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input name="age" type="number" placeholder="나이" value={formData.age} onChange={handleInputChange} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />
                                    <input name="weight" placeholder="체급 (-60kg)" value={formData.weight} onChange={handleInputChange} style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />
                                </div>

                                {/* Skills / Tags */}
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6B7280', display: 'block', marginBottom: '6px' }}>가능 종목 (복수 선택)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {['BOXING', 'MMA', 'SOCCER', 'FITNESS'].map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '20px', border: '1px solid',
                                                    background: formData.tags.includes(tag) ? '#2563EB' : 'white',
                                                    color: formData.tags.includes(tag) ? 'white' : '#6B7280',
                                                    borderColor: formData.tags.includes(tag) ? '#2563EB' : '#E5E7EB'
                                                }}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Fields */}
                                {formData.tags.includes('BOXING') && (
                                    <select name="style" value={formData.style} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#EFF6FF' }}>
                                        <option value="Orthodox">🥊 복싱: 오소독스</option>
                                        <option value="Southpaw">🥊 복싱: 사우스포</option>
                                        <option value="Infighter">🥊 복싱: 인파이터</option>
                                    </select>
                                )}
                                {formData.tags.includes('SOCCER') && (
                                    <select name="position" value={formData.position} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#ECFDF5' }}>
                                        <option value="FW">⚽ 축구: 공격수 (FW)</option>
                                        <option value="MF">⚽ 축구: 미드필더 (MF)</option>
                                        <option value="DF">⚽ 축구: 수비수 (DF)</option>
                                        <option value="GK">⚽ 축구: 골키퍼 (GK)</option>
                                    </select>
                                )}

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#6B7280', display: 'block', marginBottom: '4px' }}>전적 (승/패/무)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input name="win" type="number" placeholder="승" value={formData.win} onChange={handleInputChange} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />
                                        <input name="loss" type="number" placeholder="패" value={formData.loss} onChange={handleInputChange} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />
                                        <input name="draw" type="number" placeholder="무" value={formData.draw} onChange={handleInputChange} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                                <button onClick={handleCloseModal} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', background: '#F3F4F6', color: '#4B5563', fontWeight: 'bold' }}>취소</button>
                                <button onClick={handleRealSubmit} style={{ flex: 2, padding: '1rem', borderRadius: '8px', border: 'none', background: '#2563EB', color: 'white', fontWeight: 'bold' }}>저장하기</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        );
    }

    return (
        <main style={{ padding: '1.5rem' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ width: '100px', height: '100px', background: '#EFF6FF', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                    👤
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>김선수 (User)</h1>
                <p style={{ color: '#6B7280' }}>아마추어 복서 • 3전 2승</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <h3>내 전적</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563EB' }}>3 Fights</p>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <h3>최근 스타일</h3>
                    <p>인파이터 / 오소독스</p>
                </div>
            </div>

            <button onClick={toggleManagerMode} style={{ width: '100%', marginTop: '2rem', padding: '1rem', background: '#1F2937', borderRadius: '12px', color: 'white', fontWeight: 'bold' }}>
                🛡️ 체육관 관장님으로 전환
            </button>
        </main>
    );
}
