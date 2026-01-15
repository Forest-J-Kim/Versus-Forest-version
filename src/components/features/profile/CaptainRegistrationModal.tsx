"use client";

import React, { useState } from 'react';
import { SPORTS, Sport } from "@/app/page";
import { createClient } from "@/utils/supabase/client";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
}

export default function CaptainRegistrationModal({ isOpen, onClose, onSuccess, userId }: Props) {
    const supabase = createClient();
    const [selectedSport, setSelectedSport] = useState<string>('BOXING');
    const [businessNumber, setBusinessNumber] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleRegister = async () => {
        if (businessNumber.length !== 10) {
            alert("사업자 등록번호 10자리를 정확히 입력해주세요.");
            return;
        }

        setLoading(true);

        // 1. Loading Simulation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. DB Update (Merge roles)
        // First get existing roles
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('id', userId)
            .single();

        const currentRoles = profile?.roles || {};
        const newRoles = { ...currentRoles, [selectedSport.toLowerCase()]: 'captain' };

        const { error } = await supabase
            .from('profiles')
            .update({ roles: newRoles })
            .eq('id', userId);

        setLoading(false);

        if (error) {
            console.error(error);
            alert("등록 중 오류가 발생했습니다.");
        } else {
            alert("캡틴 인증이 완료되었습니다!");
            onSuccess();
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '400px'
            }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>👑 캡틴/관장님 등록</h2>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>종목 선택</label>
                    <select
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
                    >
                        {SPORTS.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>사업자 등록번호 (10자리)</label>
                    <input
                        type="text"
                        placeholder="1234567890"
                        maxLength={10}
                        value={businessNumber}
                        onChange={(e) => setBusinessNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={onClose}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #ddd', backgroundColor: '#f9fafb' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', backgroundColor: '#111827', color: 'white', fontWeight: 'bold' }}
                    >
                        {loading ? '인증 중...' : '인증하기'}
                    </button>
                </div>
            </div>
        </div>
    );
}
