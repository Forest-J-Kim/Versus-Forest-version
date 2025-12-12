"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface Toast {
    id: string;
    message: string;
    type: "success" | "error";
}

interface ToastContextType {
    showToast: (message: string, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '80px', // Above bottom nav
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                width: '90%',
                maxWidth: '400px'
            }}>
                {toasts.map((toast) => (
                    <div key={toast.id} style={{
                        background: toast.type === 'success' ? '#1F2937' : '#991B1B', // Dark grey or Red
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
                    </div>
                ))}
            </div>
            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
