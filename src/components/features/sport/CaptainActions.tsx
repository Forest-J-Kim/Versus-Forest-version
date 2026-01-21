"use client";

import React from 'react';

// Inline styles for simplicity for this small component, or could use module
const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1rem',
    },
    button: {
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '1rem',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'all 0.2s',
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#111827',
        marginTop: '0.5rem',
    },
    icon: {
        fontSize: '1.75rem',
        marginBottom: '0.25rem',
    }
};

import { useRouter } from 'next/navigation';

export default function CaptainActions({ teamId }: { teamId?: string }) {
    const router = useRouter();

    const handleTeamManage = () => {
        if (teamId) {
            router.push(`/team/${teamId}`);
        } else {
            alert("팀 정보를 찾을 수 없습니다.");
        }
    };

    return (
        <div style={styles.grid}>
            <div style={styles.button} onClick={handleTeamManage}>
                <span style={styles.icon}>📋</span>
                <span style={styles.title}>팀 관리</span>
            </div>
            <div style={styles.button} onClick={() => alert("준비중입니다.")}>
                <span style={styles.icon}>📝</span>
                <span style={styles.title}>경기 등록</span>
            </div>
        </div>
    );
}
