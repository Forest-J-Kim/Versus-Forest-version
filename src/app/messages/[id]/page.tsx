"use client";

import React, { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '@/components/features/chat/ChatLayout.module.css';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ChatRoomPage({ params }: PageProps) {
    const router = useRouter();
    const resolvedParams = use(params);
    const searchParams = useSearchParams();
    const partnerName = searchParams.get('name') || '상대방';

    const [messages, setMessages] = useState([
        { id: 1, text: '안녕하세요! 매치 문의드립니다.', isMine: true, time: '오후 2:28' },
        { id: 2, text: '네 안녕하세요! 이번주 토요일 말씀이시죠?', isMine: false, time: '오후 2:29' },
        { id: 3, text: '이번주 토요일 2시 매치 가능하신가요?', isMine: false, time: '오후 2:30' },
    ]);
    const [inputValue, setInputValue] = useState('');

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const newMsg = {
            id: Date.now(),
            text: inputValue,
            isMine: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([...messages, newMsg]);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div className={styles.roomContainer}>
            {/* Header */}
            <div className={styles.roomHeader}>
                <span className={styles.backButton} onClick={() => router.back()}>←</span>
                <span className={styles.roomTitle}>{partnerName}</span>
            </div>

            {/* Message List */}
            <div className={styles.messageList}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`${styles.bubbleRow} ${msg.isMine ? styles.me : styles.other}`}
                    >
                        {!msg.isMine && <span className={styles.timestamp}>{msg.time}</span>}
                        <div className={`${styles.bubble} ${msg.isMine ? styles.me : styles.other}`}>
                            {msg.text}
                        </div>
                        {msg.isMine && <span className={styles.timestamp}>{msg.time}</span>}
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
                <input
                    className={styles.inputField}
                    placeholder="메세지를 입력하세요..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className={styles.sendButton} onClick={handleSend}>
                    ➤
                </button>
            </div>
        </div>
    );
}
