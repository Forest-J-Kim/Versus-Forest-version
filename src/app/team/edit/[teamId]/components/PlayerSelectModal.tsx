"use client";

import React from 'react';
import styles from './PlayerSelectModal.module.css';

interface Player {
    id: string; // player id (uuid)
    user_id: string;
    name: string;
    avatar_url?: string;
    photo_url?: string;
    skills?: any;
}

interface PlayerSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    players: Player[];
    onSelect: (player: Player) => void;
    onClear?: () => void;
    title: string;
}

export default function PlayerSelectModal({ isOpen, onClose, players, onSelect, onClear, title }: PlayerSelectModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>{title}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {onClear && (
                            <button onClick={onClear} className={styles.clearButton} style={{ fontSize: '0.8rem', color: '#EF4444', border: '1px solid #EF4444', padding: '2px 6px', borderRadius: '4px', background: 'white' }}>
                                해제
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeButton}>X</button>
                    </div>
                </div>
                <div className={styles.list}>
                    {players.map(player => (
                        <div key={player.id} className={styles.item} onClick={() => onSelect(player)}>
                            <img
                                src={player.avatar_url || player.photo_url || 'https://via.placeholder.com/40'}
                                alt={player.name}
                                className={styles.avatar}
                            />
                            <div className={styles.info}>
                                <div className={styles.name}>{player.name}</div>
                                <div className={styles.pos}>{player.skills?.position || '-'}</div>
                            </div>
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div className={styles.empty}>선수가 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
