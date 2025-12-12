"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Mode = "INDIVIDUAL" | "TEAM";

interface ModeContextType {
    mode: Mode;
    toggleMode: () => void;
    setMode: (mode: Mode) => void;
    isManagerMode: boolean; // Added
    toggleManagerMode: () => void; // Added
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<Mode>("INDIVIDUAL");
    const [isManagerMode, setIsManagerMode] = useState(false); // Added

    const toggleMode = () => {
        setMode((prev) => (prev === "INDIVIDUAL" ? "TEAM" : "INDIVIDUAL"));
    };

    const toggleManagerMode = () => { // Added
        setIsManagerMode(prev => !prev);
    };

    return (
        <ModeContext.Provider value={{ mode, toggleMode, setMode, isManagerMode, toggleManagerMode }}>
            {children}
        </ModeContext.Provider>
    );
}

export function useMode() {
    const context = useContext(ModeContext);
    if (context === undefined) {
        throw new Error("useMode must be used within a ModeProvider");
    }
    return context;
}
