"use client";

import React, { useState, useEffect } from 'react';
import styles from './EditTeamInfoModal.module.css';
import NaverLocationPicker from '@/components/common/NaverLocationPicker';

interface EditTeamInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: any;
    onSave: (updatedData: any) => Promise<void>;
}

export default function EditTeamInfoModal({ isOpen, onClose, team, captainName, onSave, onChangeCaptain }: EditTeamInfoModalProps & { captainName: string, onChangeCaptain: () => void }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (team) {
            setName(team.team_name || '');
            setDesc(team.description || '');
            setLocation(team.location || '');
        }
    }, [team, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave({ team_name: name, description: desc, location: location });
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h3>기본 정보 수정</h3>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label>팀 이름</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.field}>
                        <NaverLocationPicker onLocationSelect={setLocation} initialAddress={location} />
                    </div>

                    <div className={styles.field}>
                        <label>한줄 소개</label>
                        <input
                            type="text"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>주장 (대표)</label>
                        <div className={styles.captainDisplay}>
                            <span>{captainName}</span>
                            <button
                                type="button"
                                className={styles.changeCaptainBtn}
                                onClick={onChangeCaptain}
                            >
                                변경
                            </button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                            주장을 변경하면 관리 권한이 즉시 이전됩니다.
                        </p>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>취소</button>
                        <button type="submit" disabled={loading} className={styles.saveBtn}>
                            {loading ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
