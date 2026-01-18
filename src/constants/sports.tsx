import React from "react";

// Shared Sport Interface & Data
export interface Sport {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    type: 'TEAM' | 'COMBAT' | 'RACKET' | 'INDIVIDUAL';
}

export const SPORTS: Sport[] = [
    { id: 'SOCCER', name: '축구/풋살', icon: '⚽', color: '#EFF6FF', type: 'TEAM' },
    { id: 'BOXING', name: '복싱', icon: '🥊', color: '#FEF2F2', type: 'COMBAT' },
    { id: 'BASKETBALL', name: '농구', icon: '🏀', color: '#FFF7ED', type: 'TEAM' },
    { id: 'BASEBALL', name: '야구', icon: '⚾', color: '#F0FDF4', type: 'TEAM' },
    { id: 'RACKET', name: '배드민턴/테니스', icon: '🏸', color: '#FAF5FF', type: 'RACKET' },
    { id: 'KICKBOXING', name: '킥복싱/MMA', icon: '🦵', color: '#FFF1F2', type: 'COMBAT' },
    { id: 'JUDO', name: '유도/주짓수', icon: '🥋', color: '#F0F9FF', type: 'COMBAT' },
    { id: 'HEALTH', name: '헬스', icon: <span style={{ fontSize: '1em', display: 'inline-block' }}>🏋️‍♂️</span>, color: '#F3F4F6', type: 'INDIVIDUAL' },
];
