"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/features/chat/ChatLayout.module.css';

// Mock Conversations
const CONVERSATIONS = [
    {
        id: '1',
        name: '박풋살',
        lastMessage: '이번주 토요일 2시 매치 가능하신가요?',
        time: '오후 2:30',
        avatar: '⚽'
    },
    {
        id: '2',
        name: '김복서',
        lastMessage: '스파링 장소 어디로 잡을까요?',
        time: '오전 11:15',
        avatar: '🥊'
    },
    {
        id: '3',
        name: 'VERSUS 알림',
        lastMessage: '회원님의 매칭이 확정되었습니다.',
        time: '어제',
        avatar: '🔔'
    }
];

export default function MessageListPage() {
    const router = useRouter();

    return (
        <main className={styles.container}>
            <h1 className={styles.headerTitle}>메세지</h1>

            <div className={styles.list}>
                {CONVERSATIONS.map((conv) => (
                    <div
                        key={conv.id}
                        className={styles.conversationItem}
                        onClick={() => router.push(`/messages/${conv.id}?name=${conv.name}`)}
                    >
                        <div className={styles.avatar}>{conv.avatar}</div>
                        <div className={styles.content}>
                            <div className={styles.topRow}>
                                <span className={styles.name}>{conv.name}</span>
                                <span className={styles.time}>{conv.time}</span>
                            </div>
                            <div className={styles.messagePreview}>{conv.lastMessage}</div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
