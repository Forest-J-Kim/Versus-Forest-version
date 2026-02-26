
import React from 'react';
import { createClient } from "@/utils/supabase/server";
import { redirect } from 'next/navigation';
import { SPORTS } from "@/constants/sports";
import TeamCreateClient from './TeamCreateClient';
import Link from 'next/link';

// Helper to keep sport names consistent - ideal to move to shared utils
const SPORT_NAMES: { [key: string]: string } = {
    SOCCER: '축구/풋살',
    BOXING: '복싱',
    BASKETBALL: '농구',
    BASEBALL: '야구',
    RACKET: '배드민턴/테니스',
    KICKBOXING: '킥복싱/MMA',
    JUDO: '유도/주짓수',
    HEALTH: '헬스',
};

// Mapping for URL param (Korean) to DB value (English)
const SPORT_MAPPING: Record<string, string> = {
    '축구/풋살': 'SOCCER',
    '축구': 'SOCCER',
    '풋살': 'FUTSAL',
    '야구': 'BASEBALL',
    '농구': 'BASKETBALL',
    '복싱': 'BOXING',
    '헬스': 'HEALTH',
    '격투기': 'BOXING',
    '배드민턴/테니스': 'RACKET',
    '배드민턴': 'RACKET',
    '테니스': 'TENNIS',
    '킥복싱/MMA': 'KICKBOXING',
    '킥복싱': 'KICKBOXING',
    'MMA': 'MMA',
    '유도/주짓수': 'JUDO',
    '유도': 'JUDO',
    '주짓수': 'JIUJITSU'
};

export default async function TeamCreatePage({ searchParams }: { searchParams: Promise<{ sport: string }> }) {
    const supabase = await createClient();

    // 1. Await searchParams as required in Next.js 15
    const { sport } = await searchParams;

    // 2. Decode URL component to handle Korean characters correctly
    const decodedSport = decodeURIComponent(sport || '');

    // 3. Map to DB Sport Type
    const targetSportType = SPORT_MAPPING[decodedSport] || decodedSport.toUpperCase();

    console.log(`🎯 [Mapping] "${decodedSport}" -> "${targetSportType}" 로 변환하여 검색합니다.`);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    if (!sport) {
        // Simple error UI for missing basic param
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
                <h2 className="text-xl font-bold mb-4">잘못된 접근입니다.</h2>
                <p className="text-gray-600 mb-6">종목 정보가 누락되었습니다.</p>
                <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg">홈으로 이동</Link>
            </div>
        );
    }

    // 4. Precise Profile Check using Mapped Sport Type
    const { data: player, error } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .eq('sport_type', targetSportType) // Use mapped value
        .single();

    // 4. Handle Missing Profile (No Alert, Friendly UI)
    if (error || !player) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-gray-50 rounded-lg m-4">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold mb-2 text-gray-800">
                    아직 {decodedSport} 선수 프로필이 없습니다.
                </h2>
                <p className="text-gray-600 mb-8 max-w-md">
                    팀을 창단하려면 먼저 해당 종목의 선수 프로필을 등록해야 합니다.
                </p>
                <div className="flex gap-4">
                    <Link href="/" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                        취소
                    </Link>
                    <Link
                        href={`/profile/register/${targetSportType}`}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition"
                    >
                        프로필 만들러 가기
                    </Link>
                </div>
            </div>
        );
    }

    // Prepare metadata for the client component
    const sportMeta = SPORTS.find(s => s.id === targetSportType.toUpperCase());
    const sportName = sportMeta?.name || SPORT_NAMES[targetSportType] || targetSportType.toUpperCase();
    const sportIcon = sportMeta?.icon || '🏆';

    // 5. Render Client Component if Validation Passes
    return (
        <TeamCreateClient
            userId={user.id}
            playerId={player.id}
            sportId={targetSportType}
            sportName={sportName}
            sportIcon={sportIcon}
        />
    );
}
