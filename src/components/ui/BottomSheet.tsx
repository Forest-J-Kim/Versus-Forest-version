"use client";

import React, { useEffect } from 'react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.bottomSheetOverlay} onClick={onClose}>
            <div 
                className={styles.bottomSheetContainer} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.handleBar} />
                {children}
            </div>
        </div>
    );
}
