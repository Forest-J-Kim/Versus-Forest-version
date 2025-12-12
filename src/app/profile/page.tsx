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

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        style: 'Orthodox',
        weight: '',
        win: '',
        loss: '',
        draw: ''
    });

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRealSubmit = async () => {
        if (!formData.name || !formData.weight) {
            alert("이름과 체급은 필수입니다.");
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
            style: formData.style, // New Schema Column
            age: parseInt(formData.age) || null, // New Schema Column
            status: 'active',
            manager_id: 'manager-1234' // Temp ID 
        };

        try {
            const { error } = await supabase.from('players').insert([payload]);
            if (error) throw error;

            alert("선수 등록 완료!");
            setIsModalOpen(false);
            setFormData({ name: '', age: '', style: 'Orthodox', weight: '', win: '', loss: '', draw: '' }); // Reset
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

                <section style={{ marginBottom: '2rem' }}>
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
                                    <div style={{ width: '48px', height: '48px', background: '#F3F4F6', borderRadius: '50%', marginRight: '1rem' }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{player.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                            {player.record} • {player.style && `${player.style} • `}{player.weight_class}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <div style={{
                                            fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px',
                                            background: player.status === 'active' ? '#DCFCE7' : '#F3F4F6',
                                            color: player.status === 'active' ? '#166534' : '#374151'
                                        }}>
                                            {player.status === 'active' ? '시합대기' : '휴식'}
                                        </div>
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

                {/* --- Player Registration Modal --- */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                        <div style={{ background: 'white', width: '90%', maxWidth: '400px', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>새 선수 등록</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <input name="name" placeholder="이름 (Name)" value={formData.name} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input name="age" type="number" placeholder="나이" value={formData.age} onChange={handleInputChange} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />
                                    <select name="style" value={formData.style} onChange={handleInputChange} style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
                                        <option value="Orthodox">오소독스 (오른손)</option>
                                        <option value="Southpaw">사우스포 (왼손)</option>
                                        <option value="Switch">해결사 (스위치)</option>
                                        <option value="Grappler">그래플러</option>
                                    </select>
                                </div>

                                <input name="weight" placeholder="체급 (예: -60kg)" value={formData.weight} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }} />

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
                                <button onClick={handleRealSubmit} style={{ flex: 2, padding: '1rem', borderRadius: '8px', border: 'none', background: '#2563EB', color: 'white', fontWeight: 'bold' }}>등록하기</button>
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
