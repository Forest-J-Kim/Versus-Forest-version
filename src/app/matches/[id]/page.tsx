"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useMode } from "@/components/providers/ModeProvider";
import { useToast } from "@/components/providers/ToastProvider";
import GoogleMapViewer from "@/components/common/GoogleMapViewer";

export default function ApplyMatchPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const supabase = createClient();
    const { isManagerMode } = useMode();
    const { showToast } = useToast();

    // Helper for address formatting
    const getSimpleAddress = (fullAddress: string) => {
        if (!fullAddress) return "";

        // [수정] 괄호 등 특수문자 제거 후 파싱
        const cleanAddress = fullAddress.replace(/[()[\]]/g, ' ').trim();
        const parts = cleanAddress.split(/[\s,]+/);

        const regions = parts.filter(p =>
            p.endsWith('시') || p.endsWith('도') || p.endsWith('구') || p.endsWith('군') || p.endsWith('읍') || p.endsWith('면')
        );

        const simple = [...new Set(regions)].join(' ');
        return simple || cleanAddress;
    };

    const unwrappedParams = use(params);
    const matchId = unwrappedParams.id;

    const [match, setMatch] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form State
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [weight, setWeight] = useState("");
    const [message, setMessage] = useState("");

    const [applicants, setApplicants] = useState<any[]>([]);

    const [isHost, setIsHost] = useState(false);
    const [isCaptain, setIsCaptain] = useState(false);
    const [applicantCount, setApplicantCount] = useState(0);



    useEffect(() => {
        const init = async () => {
            // 1. Fetch Match Info
            console.log('Fetching Match ID:', matchId);

            const { data: rawMatchData, error: matchError } = await supabase
                .from('matches')
                .select(`
                    *,
                    home_player:players!home_player_id(
                        id,
                        name,
                        avatar_url,
                        weight_class,
                        position,
                        record,
                        team_members!team_members_player_id_fkey(
                            team:teams!team_members_team_id_fkey(
                                team_name,
                                location
                            )
                        )
                    ),
                    match_weight,
                    match_type,
                    match_mode,
                    rounds,
                    gear,
                    cost,
                    uniform_color,
                    team_level,
                    match_format,
                    has_pitch,
                    home_team:teams!home_team_id(
                        team_name,
                        emblem_url,
                        location,
                        description
                    ),
                    match_applications(id),
                    chat_rooms(id)
                `)
                .eq('id', matchId)
                .single();

            const matchData = rawMatchData as any;

            // 디버깅을 위해 결과값 로그 출력
            console.log("🔥 Fetched Match Data:", matchData);

            if (matchError || !matchData) {
                console.error("Match Fetch Error:", matchError);
                alert("매칭 정보를 불러올 수 없습니다.\n" + (matchError?.message || "Unknown Error"));
                router.back();
                return;
            }
            setMatch(matchData);

            // Set Applicant Count
            if (matchData.match_applications) {
                setApplicantCount(matchData.match_applications.length);
            }

            // A. Check User & Host Status
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);

            const isOwner = user.id === matchData.host_user_id;
            setIsHost(isOwner);

            // Always Fetch Applicants (For both Host and Guest)
            const { data: apps, error } = await supabase
                .from('match_applications')
                .select(`
                    *,
                    applicant_team:teams!applicant_team_id ( team_name, emblem_url, description ),
                    player:players!applicant_player_id (
                        id, 
                        name, 
                        user_id,
                        weight_class, 
                        avatar_url,
                        position,
                        record,
                        team_members!team_members_player_id_fkey (
                            team:teams!team_members_team_id_fkey ( team_name )
                        )
                    )
                `)
                .eq('match_id', matchId)
                .order('created_at', { ascending: false });

            if (error) console.error("Applicants Fetch Error:", error);
            else setApplicants(apps || []);

            if (isOwner && matchData.status !== 'SCHEDULED') {
                setLoading(false);
                return;
            }

            if (!isOwner && matchData.status !== 'SCHEDULED') {
                // B. Guest Logic: Fetch Candidates

                // 1. Get My Players (for ID check)
                const { data: myPlayersRaw } = await supabase
                    .from('players')
                    .select('id')
                    .eq('user_id', user.id);

                const myPlayerIds = myPlayersRaw?.map(p => p.id) || [];

                // 2. Check Leadership (Captain Check)
                let myTeamId = null;
                if (myPlayerIds.length > 0) {
                    const { data: leaderMember } = await supabase
                        .from('team_members')
                        .select('team_id')
                        .in('player_id', myPlayerIds)
                        .eq('role', 'LEADER')
                        .limit(1)
                        .maybeSingle();
                    myTeamId = leaderMember?.team_id;
                    setIsCaptain(!!myTeamId);
                }

                let finalCandidates: any[] = [];

                if (myTeamId) {
                    // Case 1: Captain -> Fetch All Team Members
                    const { data: teamMembers } = await supabase
                        .from('team_members')
                        .select('player:players!inner(id, name, weight_class, avatar_url, sport_type, record, position)')
                        .eq('team_id', myTeamId);

                    if (teamMembers) {
                        finalCandidates = teamMembers.map((tm: any) => tm.player);
                    }
                } else {
                    // Case 2: Solo/Member -> Fetch My Players Only
                    const { data: myPlayersFull } = await supabase
                        .from('players')
                        .select('id, name, weight_class, avatar_url, sport_type, record, position')
                        .eq('user_id', user.id);

                    if (myPlayersFull) {
                        finalCandidates = myPlayersFull;
                    }
                }

                // 3. Filter by Sport Type (Case Insensitive) & Unique
                const targetSport = (matchData.sport_type || '').toUpperCase();
                const filtered = finalCandidates.filter((p: any) =>
                    (p.sport_type || '').toUpperCase() === targetSport
                );

                // Deduplicate (map by id)
                const uniqueCandidates = Array.from(new Map(filtered.map(item => [item['id'], item])).values());

                setCandidates(uniqueCandidates);
            }
            setLoading(false);
            return;
        };

        init();
    }, [matchId, isManagerMode, router, supabase]);

    const handleEnterChat = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            if (isHost) {
                // 호스트는 수락된 신청자와의 채팅방을 찾아야 함
                const acceptedApp = applicants.find(a => a.status === 'ACCEPTED');
                if (!acceptedApp) {
                    alert("수락된 신청자가 없어 채팅방을 찾을 수 없습니다.");
                    return;
                }

                const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
                const isTeamSport = TEAM_SPORTS.includes((match?.sport_type || '').toUpperCase());

                let query = supabase
                    .from('chat_rooms')
                    .select('id')
                    .eq('match_id', matchId)
                    .eq('host_id', user.id)
                    .eq('applicant_user_id', acceptedApp.applicant_user_id);

                if (isTeamSport && acceptedApp.applicant_team_id) {
                    query = query.eq('applicant_team_id', acceptedApp.applicant_team_id);
                } else if (!isTeamSport && acceptedApp.applicant_player_id) {
                    query = query.eq('applicant_player_id', acceptedApp.applicant_player_id);
                }

                const { data: myRoom, error } = await query.maybeSingle();

                if (myRoom) {
                    router.push(`/chat/${myRoom.id}`);
                } else {
                    alert("채팅방을 찾을 수 없습니다.");
                }
            } else {
                // 신청자는 본인이 만든 채팅방을 찾으면 됨
                const acceptedApp = applicants.find(a => a.applicant_user_id === user.id && a.status === 'ACCEPTED')
                    || applicants.find(a => a.applicant_user_id === user.id);

                let query = supabase
                    .from('chat_rooms')
                    .select('id')
                    .eq('match_id', matchId)
                    .eq('applicant_user_id', user.id);

                const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
                const isTeamSport = TEAM_SPORTS.includes((match?.sport_type || '').toUpperCase());

                if (acceptedApp) {
                    if (isTeamSport && acceptedApp.applicant_team_id) {
                        query = query.eq('applicant_team_id', acceptedApp.applicant_team_id);
                    } else if (!isTeamSport && acceptedApp.applicant_player_id) {
                        query = query.eq('applicant_player_id', acceptedApp.applicant_player_id);
                    }
                }

                const { data: myRoom, error } = await query.maybeSingle();

                if (myRoom) {
                    router.push(`/chat/${myRoom.id}`);
                } else {
                    alert("채팅방이 존재하지 않습니다.");
                }
            }
        } catch (e: any) {
            console.error("Enter Chat Error:", e);
            alert("채팅방 이동 중 오류가 발생했습니다.");
        }
    };

    const handleStartChat = async (applicantUserId: string, applicantPlayerId: string, applicantTeamId?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
        const isTeamSport = TEAM_SPORTS.includes((match?.sport_type || '').toUpperCase());

        // A. Check for existing chat room
        let query = supabase
            .from('chat_rooms')
            .select('id')
            .eq('match_id', matchId)
            .eq('host_id', user.id)
            .eq('applicant_user_id', applicantUserId);

        if (isTeamSport && applicantTeamId) {
            query = query.eq('applicant_team_id', applicantTeamId);
        } else {
            // For individual sports or missing team info, try player_id
            if (applicantPlayerId) query = query.eq('applicant_player_id', applicantPlayerId);
        }

        const { data: existingRoom, error: fetchError } = await query.maybeSingle();

        let chatRoomId = existingRoom?.id;

        if (!chatRoomId) {
            // B. Create new chat room if not exists
            const insertPayload: any = {
                match_id: matchId,
                host_id: user.id,
                applicant_user_id: applicantUserId
            };
            if (applicantPlayerId) insertPayload.applicant_player_id = applicantPlayerId;
            if (isTeamSport && applicantTeamId) {
                insertPayload.applicant_team_id = applicantTeamId;
            }

            const { data: newRoom, error: createError } = await supabase
                .from('chat_rooms')
                .insert(insertPayload)
                .select()
                .single();

            if (createError) {
                alert("채팅방 생성 실패: " + createError.message);
                return;
            }
            chatRoomId = newRoom.id;

            // Send Chat Invite Notification (Bidirectional)
            if (newRoom) {
                // 1. Prepare Common Data
                const matchDate = new Date(match.match_date).toLocaleString('ko-KR', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const commonMessage = `${matchDate} 매치에 대해 대화를 요청해 채팅방이 개설되었습니다.`;

                const SPORT_LABELS: Record<string, string> = {
                    BOXING: "🥊 복싱", MMA: "🤼 MMA", JIUJITSU: "🥋 주짓수",
                    KICKBOXING: "🦵 킥복싱", WRESTLING: "🤼 레슬링", MUAYTHAI: "🥊 무에타이",
                    SOCCER: "⚽ 축구", FUTSAL: "⚽ 풋살", BASEBALL: "⚾ 야구",
                    BASKETBALL: "🏀 농구", BADMINTON: "🏸 배드민턴", TENNIS: "🎾 테니스",
                    VOLLEYBALL: "🏐 배구", PINGPONG: "🏓 탁구"
                };
                const displayTitle = SPORT_LABELS[match.sport_type] || match.sport_type || '매치';

                // 2. Prepare Names
                // Host Name (Me)
                let hostName = user.user_metadata?.name || '호스트';
                const { data: myPlayer } = await supabase
                    .from('players')
                    .select('name')
                    .eq('id', match.home_player_id)
                    .maybeSingle();
                if (myPlayer) hostName = myPlayer.name;

                // Applicant Name (Target)
                let applicantName = '신청자';
                // Try to find in candidates/applicants list if available in scope, otherwise fallback
                // In Host View, 'applicants' state might be available? 
                // Let's check 'applicants' from state.
                const targetApp = applicants.find(a => a.applicant_player_id === applicantPlayerId);
                if (targetApp?.player) {
                    applicantName = targetApp.player.name;
                }

                // 3. Send Notifications
                const notifications = [
                    // A. To Host (Me) -> Show Applicant Name
                    {
                        receiver_id: user.id, // Host ID
                        type: 'CHAT_OPEN',
                        content: '채팅방이 개설되었습니다.',
                        redirect_url: `/chat/${newRoom.id}`,
                        is_read: false,
                        metadata: {
                            type: "CHAT_OPEN",
                            match_title: displayTitle,
                            applicant_name: applicantName,
                            message: commonMessage,
                            request_date: new Date().toISOString()
                        }
                    },
                    // B. To Applicant (Target) -> Show Host Name
                    {
                        receiver_id: applicantUserId,
                        type: 'CHAT_OPEN',
                        content: '채팅방이 개설되었습니다.',
                        redirect_url: `/chat/${newRoom.id}`,
                        is_read: false,
                        metadata: {
                            type: "CHAT_OPEN",
                            match_title: displayTitle,
                            applicant_name: hostName,
                            message: commonMessage,
                            request_date: new Date().toISOString()
                        }
                    }
                ];

                await supabase.from('notifications').insert(notifications);
            }
        }

        // C. Redirect to Chat Page
        router.push(`/chat/${chatRoomId}`);
    };

    const handleUpdateStatus = async (appId: string, newStatus: 'ACCEPTED' | 'REJECTED') => {
        if (!confirm(newStatus === 'ACCEPTED' ? "신청을 수락하시겠습니까?" : "신청을 거절하시겠습니까?")) return;

        const { error } = await supabase
            .from('match_applications')
            .update({ status: newStatus })
            .eq('id', appId);

        if (error) {
            alert("처리 중 오류 발생: " + error.message);
            return;
        }

        if (newStatus === 'ACCEPTED') {
            const applicant = applicants.find(a => a.id === appId);
            let awayTeamId = null;
            let awayPlayerId = applicant?.applicant_player_id;

            // Fetch Team ID if applicant exists
            if (awayPlayerId) {
                const { data: tm } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('player_id', awayPlayerId)
                    .maybeSingle();
                awayTeamId = tm?.team_id;
            }

            // 1. Update Match Status AND Away Info
            await supabase.from('matches').update({
                status: 'SCHEDULED',
                away_player_id: awayPlayerId,
                away_team_id: awayTeamId
            }).eq('id', matchId);

            setMatch((prev: any) => ({
                ...prev,
                status: 'SCHEDULED',
                away_player_id: awayPlayerId,
                away_team_id: awayTeamId
            }));

            // 2. Send System Message & Check Chat Room & Send Notification
            if (applicant) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Ensure Chat Room exists for the Accepted Applicant (Safe Logic)
                    let chatRoomId = null;

                    // 1. Try to find existing room for this specific applicant
                    let targetRoomQuery = supabase
                        .from('chat_rooms')
                        .select('id')
                        .eq('match_id', matchId)
                        .eq('host_id', user.id)
                        .eq('applicant_user_id', applicant.applicant_user_id);

                    const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
                    const isTeamSport = TEAM_SPORTS.includes((match?.sport_type || '').toUpperCase());

                    if (isTeamSport && applicant.applicant_team_id) {
                        targetRoomQuery = targetRoomQuery.eq('applicant_team_id', applicant.applicant_team_id);
                    } else if (applicant.applicant_player_id) {
                        targetRoomQuery = targetRoomQuery.eq('applicant_player_id', applicant.applicant_player_id);
                    }

                    const { data: targetRoom } = await targetRoomQuery.maybeSingle();

                    if (targetRoom) {
                        chatRoomId = targetRoom.id;
                    } else {
                        // 2. Create new room if not exists
                        const { data: newRoom } = await supabase
                            .from('chat_rooms')
                            .insert({
                                match_id: matchId,
                                host_id: user.id,
                                applicant_user_id: applicant.applicant_user_id,
                                applicant_player_id: applicant.applicant_player_id,
                                ...(isTeamSport && applicant.applicant_team_id ? { applicant_team_id: applicant.applicant_team_id } : {})
                            })
                            .select()
                            .single();
                        chatRoomId = newRoom?.id;
                    }

                    const SPORT_LABELS: Record<string, string> = {
                        BOXING: "🥊 복싱", MMA: "🤼 MMA", JIUJITSU: "🥋 주짓수",
                        KICKBOXING: "🦵 킥복싱", WRESTLING: "🤼 레슬링", MUAYTHAI: "🥊 무에타이",
                        SOCCER: "⚽ 축구", FUTSAL: "⚽ 풋살", BASEBALL: "⚾ 야구",
                        BASKETBALL: "🏀 농구", BADMINTON: "🏸 배드민턴", TENNIS: "🎾 테니스",
                        VOLLEYBALL: "🏐 배구", PINGPONG: "🏓 탁구"
                    };
                    const displayTitle = SPORT_LABELS[match.sport_type] || match.sport_type || '매치';
                    let hostName = match.home_player?.name || '호스트';

                    if (chatRoomId) {
                        await supabase.from('messages').insert({
                            chat_room_id: chatRoomId,
                            sender_id: user.id,
                            content: "system:::match_scheduled"
                        });

                        // [NOTIFICATION] 1. Send Accepted Notification to Applicant
                        await supabase.from('notifications').insert({
                            receiver_id: applicant.applicant_user_id,
                            type: 'MATCH_ACCEPTED',
                            content: '매치 신청이 수락되었습니다! 세부 내용을 확인해 보세요.',
                            redirect_url: `/matches/${matchId}`, // Redirect to Match Detail
                            is_read: false,
                            metadata: {
                                type: "MATCH_ACCEPTED",
                                match_title: displayTitle,
                                applicant_name: hostName,
                                message: "매치 신청이 수락되었습니다! 세부 내용을 확인해 보세요.",
                                request_date: new Date().toISOString()
                            }
                        });

                        // [NOTIFICATION] 2. Send Confirmation Notification to Host
                        let applicantName = applicant.player?.name || '신청자';
                        await supabase.from('notifications').insert({
                            receiver_id: user.id, // Host
                            type: 'MATCH_ACCEPTED',
                            content: '매치가 성사되었습니다. 세부내용을 확인해보세요.',
                            redirect_url: `/matches/${matchId}`,
                            is_read: false,
                            metadata: {
                                type: "MATCH_ACCEPTED",
                                match_title: displayTitle,
                                applicant_name: applicantName,
                                message: "매치가 성사되었습니다. 세부내용을 확인해보세요.",
                                request_date: new Date().toISOString()
                            }
                        });
                    }

                    // 3. Auto-Reject Other Applicants

                    // [NOTIFICATION] Send Rejected Notification to Auto-Rejected Applicants
                    const { data: rejectTargets } = await supabase
                        .from('match_applications')
                        .select('id, applicant_user_id, applicant_player_id, applicant_team_id')
                        .eq('match_id', matchId)
                        .neq('id', appId) // Exclude the accepted application ID
                        .eq('status', 'PENDING');

                    if (rejectTargets && rejectTargets.length > 0) {
                        const notifications = rejectTargets.map(target => ({
                            receiver_id: target.applicant_user_id,
                            type: 'MATCH_REJECTED',
                            content: '아쉽게도 매치 신청이 거절되었습니다.',
                            redirect_url: `/matches/${matchId}`,
                            is_read: false,
                            metadata: {
                                type: "MATCH_REJECTED",
                                match_title: displayTitle,
                                applicant_name: hostName,
                                message: "다른 매칭으로 찾아뵙겠습니다. (자동 거절)",
                                request_date: new Date().toISOString()
                            }
                        }));

                        await supabase.from('notifications').insert(notifications);
                    }

                    const { error: rejectError } = await supabase
                        .from('match_applications')
                        .update({ status: 'REJECTED' })
                        .eq('match_id', matchId)
                        .neq('id', appId) // Exclude the accepted application ID
                        .eq('status', 'PENDING');

                    if (!rejectError && rejectTargets && rejectTargets.length > 0) {
                        // Send System Message to each Auto-Rejected Applicant's specific Chat Room
                        const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
                        const isTeamSport = TEAM_SPORTS.includes((match?.sport_type || '').toUpperCase());

                        for (const target of rejectTargets) {
                            let query = supabase
                                .from('chat_rooms')
                                .select('id')
                                .eq('match_id', matchId)
                                .eq('host_id', user.id)
                                .eq('applicant_user_id', target.applicant_user_id);

                            if (isTeamSport && target.applicant_team_id) {
                                query = query.eq('applicant_team_id', target.applicant_team_id);
                            } else if (target.applicant_player_id) {
                                query = query.eq('applicant_player_id', target.applicant_player_id);
                            }

                            const { data: rejectedRoom } = await query.maybeSingle();

                            if (rejectedRoom) {
                                await supabase.from('messages').insert({
                                    chat_room_id: rejectedRoom.id,
                                    sender_id: user.id,
                                    content: "system:::match_rejected"
                                });
                            }
                        }
                    }

                    // Update local state to reflect rejections
                    setApplicants(prev => prev.map(a =>
                        (a.id !== appId && a.status === 'PENDING')
                            ? { ...a, status: 'REJECTED' }
                            : a
                    ));
                }
            }
        } else if (newStatus === 'REJECTED') {
            const applicant = applicants.find(a => a.id === appId);
            if (applicant) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    let query = supabase
                        .from('chat_rooms')
                        .select('id')
                        .eq('match_id', matchId)
                        .eq('host_id', user.id)
                        .eq('applicant_user_id', applicant.applicant_user_id);

                    const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
                    const isTeamSport = TEAM_SPORTS.includes((match?.sport_type || '').toUpperCase());

                    if (isTeamSport && applicant.applicant_team_id) {
                        query = query.eq('applicant_team_id', applicant.applicant_team_id);
                    } else if (applicant.applicant_player_id) {
                        query = query.eq('applicant_player_id', applicant.applicant_player_id);
                    }

                    const { data: existingRoom } = await query.maybeSingle();

                    if (existingRoom) {
                        await supabase.from('messages').insert({
                            chat_room_id: existingRoom.id,
                            sender_id: user.id,
                            content: "system:::match_rejected"
                        });
                    }

                    // [NOTIFICATION] Send Rejected Notification
                    const SPORT_LABELS: Record<string, string> = {
                        BOXING: "🥊 복싱", MMA: "🤼 MMA", JIUJITSU: "🥋 주짓수",
                        KICKBOXING: "🦵 킥복싱", WRESTLING: "🤼 레슬링", MUAYTHAI: "🥊 무에타이",
                        SOCCER: "⚽ 축구", FUTSAL: "⚽ 풋살", BASEBALL: "⚾ 야구",
                        BASKETBALL: "🏀 농구", BADMINTON: "🏸 배드민턴", TENNIS: "🎾 테니스",
                        VOLLEYBALL: "🏐 배구", PINGPONG: "🏓 탁구"
                    };
                    const displayTitle = SPORT_LABELS[match.sport_type] || match.sport_type || '매치';
                    let hostName = match.home_player?.name || '호스트';

                    await supabase.from('notifications').insert({
                        receiver_id: applicant.applicant_user_id,
                        type: 'MATCH_REJECTED',
                        content: '매치 신청이 거절되었습니다.',
                        redirect_url: `/matches/${matchId}`,
                        is_read: false,
                        metadata: {
                            type: "MATCH_REJECTED",
                            match_title: displayTitle,
                            applicant_name: hostName,
                            message: "아쉽게도 매치 신청이 거절되었습니다.",
                            request_date: new Date().toISOString()
                        }
                    });
                }
            }
        }

        setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        showToast(newStatus === 'ACCEPTED' ? "수락되었습니다." : "거절되었습니다.", "success");
    };

    const handleCancelApplication = async (appId: string) => {
        if (!confirm("정말 신청을 취소하시겠습니까?")) return;

        // 1. Fetch Application Details (Before Deletion)
        const { data: appData } = await supabase
            .from('match_applications')
            .select(`
                match_id,
                applicant_player:players!applicant_player_id ( name ),
                match:matches!match_id ( host_user_id, sport_type, match_type )
            `)
            .eq('id', appId)
            .single();

        // 2. Delete Application
        const { error } = await supabase
            .from('match_applications')
            .delete()
            .eq('id', appId);

        if (error) {
            alert("취소 중 오류 발생: " + error.message);
            return;
        }

        // 3. Send Notification to Host (Using fetched data)
        // @ts-ignore
        if (appData && appData.match?.host_user_id) {
            const SPORT_LABELS: Record<string, string> = {
                BOXING: "🥊 복싱", MMA: "🤼 MMA", JIUJITSU: "🥋 주짓수",
                KICKBOXING: "🦵 킥복싱", WRESTLING: "🤼 레슬링", MUAYTHAI: "🥊 무에타이",
                SOCCER: "⚽ 축구", FUTSAL: "⚽ 풋살", BASEBALL: "⚾ 야구",
                BASKETBALL: "🏀 농구", BADMINTON: "🏸 배드민턴", TENNIS: "🎾 테니스",
                VOLLEYBALL: "🏐 배구", PINGPONG: "🏓 탁구"
            };

            // @ts-ignore
            const sType = appData.match.sport_type || '';
            // @ts-ignore
            const displayTitle = SPORT_LABELS[sType] || sType || appData.match.match_type || '매치';
            // @ts-ignore
            const applicantName = appData.applicant_player?.name || "신청자";

            await supabase.from('notifications').insert({
                // @ts-ignore
                receiver_id: appData.match.host_user_id,
                type: 'MATCH_CANCEL',
                content: `${applicantName}님이 신청을 취소했습니다.`,
                // @ts-ignore
                redirect_url: `/matches/${appData.match_id}`,
                is_read: false,
                metadata: {
                    type: "MATCH_CANCEL",
                    match_title: displayTitle,
                    applicant_name: applicantName,
                    message: "매치 신청을 취소했습니다.",
                    request_date: new Date().toISOString()
                }
            });
        }

        setApplicants(prev => prev.filter(a => a.id !== appId));
        showToast("신청이 취소되었습니다.", "success");
    };

    const handleDeleteMatch = async () => {
        if (!confirm("매치를 취소하시겠습니까? 목록에서 숨겨지며, 채팅방 기록은 보존됩니다.")) return;

        try {
            setSubmitting(true);

            // 1. 알림 대상자(게스트) 조회
            const { data: targetApp } = await supabase
                .from('match_applications')
                .select('applicant_user_id')
                .eq('match_id', matchId)
                .eq('status', 'ACCEPTED')
                .maybeSingle();

            // 2. 알림 발송
            if (targetApp) {
                const SPORT_LABELS: Record<string, string> = {
                    BOXING: "🥊 복싱", SOCCER: "⚽ 축구", BASEBALL: "⚾ 야구",
                    BASKETBALL: "🏀 농구", BADMINTON: "🏸 배드민턴", TENNIS: "🎾 테니스",
                    VOLLEYBALL: "🏐 배구", PINGPONG: "🏓 탁구",
                    MMA: "🤼 MMA", JIUJITSU: "🥋 주짓수", KICKBOXING: "🦵 킥복싱", WRESTLING: "🤼 레슬링", MUAYTHAI: "🥊 무에타이"
                };
                const sType = match.sport_type || '';
                const displayTitle = SPORT_LABELS[sType] || sType || '매치';

                await supabase.from('notifications').insert({
                    receiver_id: targetApp.applicant_user_id,
                    type: 'MATCH_CANCEL',
                    content: '호스트 사정으로 매치가 취소되었습니다.',
                    redirect_url: '/matches',
                    is_read: false,
                    metadata: {
                        type: "MATCH_CANCEL",
                        match_title: displayTitle,
                        applicant_name: "호스트",
                        message: "매치가 취소(삭제)되었습니다.",
                        request_date: new Date().toISOString()
                    }
                });
            }

            // 3. Soft Delete 실행
            const { error: updateError } = await supabase
                .from('matches')
                .update({ status: 'DELETED' })
                .eq('id', matchId);

            if (updateError) throw updateError;

            alert("매치가 취소되었습니다.");
            router.replace('/matches');

        } catch (error: any) {
            console.error("매치 취소 실패:", error);
            alert("오류 발생: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };



    const handleSubmit = async () => {
        if (selectedPlayerIds.length === 0) return alert("출전할 선수를 1명 이상 선택해주세요.");
        // Weight check? If multiple, maybe optional or applies to all?
        // Let's assume input weight applies to all for now, or make it optional if logic allows. 
        // User request: "입력된 '신청 체급'과 '한마디(Message)'는 선택된 모든 선수에게 동일하게 적용한다."
        if (!weight) return alert("신청 체급을 입력해주세요.");

        if (!confirm(`${selectedPlayerIds.length}명의 선수를 일괄 신청하시겠습니까?`)) return;

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("로그인이 필요합니다.");

        try {
            const promises = selectedPlayerIds.map(pid =>
                supabase.from('match_applications').insert({
                    match_id: matchId,
                    applicant_user_id: user.id,
                    applicant_player_id: pid,
                    application_weight: weight,
                    message: message,
                    status: 'PENDING'
                })
            );

            await Promise.all(promises);

            // B. Insert Notification (Once for the host? Or per application? let's do once)
            if (match.host_user_id) {
                await supabase.from('notifications').insert({
                    receiver_id: match.host_user_id,
                    type: 'MATCH_APPLY',
                    content: `새로운 매칭 신청이 도착했습니다. (${selectedPlayerIds.length}명)`,
                    redirect_url: `/matches`,
                    is_read: false
                });
            }

            showToast(`${selectedPlayerIds.length}명의 신청이 완료되었습니다!`, "success");
            router.push('/matches'); // Or reload? Plan said reload. But router push is fine.
            // window.location.reload(); // Redirecting to list is safer to see status? 
            // Actually router.push('/matches') is existing behavior. Keep it.
        } catch (e: any) {
            console.error("Apply Error:", e);
            alert("신청 중 오류 발생: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    // [New] Define isTeamSport for rendering logic (Global Scope)
    const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
    const currentSport = (match?.sport_type || '').toUpperCase();
    const isTeamSport = TEAM_SPORTS.includes(currentSport);

    // [Fix] 삭제된 매치 전용 뷰 (Early Return)
    if (match && match.status === 'DELETED') {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F3F4F6', // 회색 배경
                padding: '20px'
            }}>
                <div style={{
                    border: '6px solid #EF4444', // 빨간 테두리
                    padding: '40px 30px',
                    borderRadius: '16px',
                    // transform: 'rotate(-10deg)', // 도장 기울기 삭제
                    textAlign: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    maxWidth: '320px',
                    width: '100%'
                }}>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: '900',
                        color: '#EF4444',
                        marginBottom: '16px',
                        lineHeight: '1.2'
                    }}>
                        🚫 삭제된<br />매치입니다
                    </div>
                    <div style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: '#EF4444',
                        opacity: 0.9,
                        wordBreak: 'keep-all'
                    }}>
                        호스트의 사정으로<br />매치가 취소되었습니다.
                    </div>
                </div>

                <button
                    onClick={() => router.back()}
                    style={{
                        marginTop: '40px',
                        padding: '14px 24px',
                        background: 'white', // 흰색 버튼
                        color: '#111827', // 검은색 글씨
                        border: '1px solid #E5E7EB', // 연한 테두리
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                    }}
                >
                    ← 목록으로 돌아가기
                </button>
            </div>
        );
    }

    // --- SCHEDULED MODE VIEW ---
    if (match.status === 'SCHEDULED') {
        const acceptedApp = applicants.find(a => a.status === 'ACCEPTED');
        const rejectedApps = applicants.filter(a => a.status === 'REJECTED');
        const chatRoomId = match.chat_rooms?.[0]?.id;
        const isTeamSport = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'].includes((match.sport_type || '').toUpperCase());

        return (
            <div style={{ background: isTeamSport ? '#F3F4F6' : 'var(--background)', minHeight: '100vh', paddingBottom: '40px' }}>
                <header style={{
                    background: 'white', borderBottom: '1px solid #E5E7EB', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100
                }}>
                    <button onClick={() => router.back()} style={{
                        padding: '8px', marginRight: '8px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1
                    }}>←</button>
                    <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>성사된 매치</h1>
                </header>

                <main style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* VS Match Card (New Design: Intense Fighting Arena with Webtoon Bg) */}
                    <section style={{
                        padding: '4px',
                        /* [수정1] 바닥 배경색: 축구면 하얗게, 복싱이면 원래대로 시커멓게 */
                        background: isTeamSport ? '#FFFFFF' : 'radial-gradient(ellipse at center, #7f1d1d 0%, #1a0505 70%, #000000 100%)',
                        borderRadius: '18px',
                        /* [수정2] 빨간색 그림자/테두리: 축구면 연한 회색으로 깔끔하게 제거 */
                        boxShadow: isTeamSport ? '0 10px 25px rgba(0,0,0,0.1)' : '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.3)',
                        border: isTeamSport ? '1px solid #E5E7EB' : '1px solid #333',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '600px', // 세로로 더 길게 (인스타 스토리 비율 고려)
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        {/* Background Image Layer (User Provided) */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundImage: currentSport === 'BASKETBALL' ? 'url("/images/basketball_bg.jpg")' : (isTeamSport ? 'url("/images/stadium_bg.jpg")' : 'url("/images/match_bg.png")'),
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            /* [수정3] 투명도를 1(100%)로 올려서 쨍하게 */
                            opacity: isTeamSport ? 1 : 0.5,
                            /* [수정4] 🌟가장 핵심🌟 밝기(brightness) 깎아먹던 필터 없앰! */
                            filter: isTeamSport ? 'brightness(1.2) contrast(100%)' : 'grayscale(100%) contrast(120%)',
                            zIndex: 0
                        }}></div>

                        <div style={{
                            background: isTeamSport ? 'rgba(255, 255, 255, 0.7)' : 'rgba(20, 20, 20, 0.3)',
                            backdropFilter: 'blur(3px)',
                            borderRadius: '14px',
                            padding: '40px 20px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            border: isTeamSport ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: isTeamSport ? 'none' : 'inset 0 0 20px rgba(0,0,0,0.5)',
                            position: 'relative',
                            zIndex: 1,
                            margin: '10px'
                        }}>

                            {/* Top Layer: Emblem OR MATCHDAY */}
                            {isTeamSport ? (
                                <div style={{ marginBottom: '32px', marginTop: '12px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: '900', fontStyle: 'italic', letterSpacing: '4px', color: '#111827', margin: 0, textTransform: 'uppercase' }}>
                                        MATCHDAY
                                    </h2>
                                </div>
                            ) : (
                                <div style={{ width: '120px', height: '120px', marginBottom: '24px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', boxShadow: '0 0 15px rgba(0,0,0,0.8)' }}>
                                    {match.home_team?.emblem_url ? <img src={match.home_team.emblem_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏆'}
                                </div>
                            )}

                            {/* Date & Location */}
                            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                {isTeamSport ? (
                                    <>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
                                            {new Date(match.match_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })} | {new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </h3>
                                        <div style={{ fontSize: '1rem', color: '#374151', fontWeight: '600' }}>
                                            📍 {match.home_team?.location || match.match_location}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF', marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                            {new Date(match.match_date).toLocaleDateString()}
                                        </h3>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#E5E7EB', marginBottom: '12px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                            {new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </h3>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#F3F4F6', marginBottom: '6px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                            {match.home_team?.team_name || "장소 정보 없음"}
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: '#E5E7EB', fontWeight: '500', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>📍 {match.home_team?.location || match.match_location || "장소 미정"}</p>
                                    </>
                                )}
                            </div>

                            {/* VS Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', width: '100%', gap: '8px', alignItems: 'center' }}>

                                {isTeamSport ? (
                                    <>
                                        {/* Home Team */}
                                        <div
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
                                            onClick={() => match.home_team_id && router.push(`/team/${match.home_team_id}`)}
                                        >
                                            <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '4px solid #EF4444', padding: '2px', marginBottom: '12px', boxShadow: '0 0 25px rgba(239, 68, 68, 0.7)' }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {match.home_team?.emblem_url ? <img src={match.home_team.emblem_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛡️'}
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#111827', marginBottom: '6px' }}>
                                                {match.home_team?.team_name || "Home Team"}
                                            </span>
                                            <div style={{ fontSize: '0.8rem', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '600' }}>
                                                <span>{match.home_team?.recent_wins || match.home_team?.wins || 0}승 {match.home_team?.recent_losses || match.home_team?.losses || 0}패</span>
                                                <span style={{ opacity: 0.8 }}>👑 {match.home_player?.name || "주장"}</span>
                                            </div>
                                        </div>

                                        {/* VS Text (The Impact) */}
                                        <div style={{
                                            fontSize: '4.5rem',
                                            fontStyle: 'italic',
                                            fontWeight: '900',
                                            color: '#DC2626',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            transform: 'skew(-10deg) rotate(-5deg)',
                                            zIndex: 10, marginLeft: '-20px'
                                        }}>
                                            VS
                                        </div>

                                        {/* Away Team */}
                                        <div
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
                                            onClick={() => acceptedApp?.applicant_team_id && router.push(`/team/${acceptedApp.applicant_team_id}`)}
                                        >
                                            <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '4px solid #3B82F6', padding: '2px', marginBottom: '12px', boxShadow: '0 0 25px rgba(59, 130, 246, 0.7)' }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {acceptedApp?.applicant_team?.emblem_url ? <img src={acceptedApp.applicant_team.emblem_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛡️'}
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#111827', marginBottom: '6px' }}>
                                                {acceptedApp?.applicant_team?.team_name || "Away Team"}
                                            </span>
                                            <div style={{ fontSize: '0.8rem', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '600' }}>
                                                <span>{acceptedApp?.applicant_team?.recent_wins || acceptedApp?.applicant_team?.wins || 0}승 {acceptedApp?.applicant_team?.recent_losses || acceptedApp?.applicant_team?.losses || 0}패</span>
                                                <span style={{ opacity: 0.8 }}>👑 {acceptedApp?.player?.name || "주장"}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Red Corner (Host) */}
                                        <div
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
                                            onClick={() => router.push(match.match_mode === 'TEAM' || match.sport_type === 'SOCCER' || match.sport_type === 'FUTSAL' || match.sport_type === 'BASEBALL' || match.sport_type === 'BASKETBALL' && match.home_team_id ? `/team/${match.home_team_id}` : `/player/${match.home_player_id}`)}
                                        >
                                            <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: '3px solid #EF4444', padding: '2px', marginBottom: '12px', boxShadow: '0 0 25px rgba(239, 68, 68, 0.7)' }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                                                    {match.home_player?.avatar_url ? <img src={match.home_player.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', marginBottom: '6px', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                                {match.home_player?.name || "Host"}
                                            </span>
                                            <div style={{ fontSize: '0.8rem', color: '#D1D5DB', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '500' }}>
                                                <span>{match.home_player?.weight_class ? `${match.home_player.weight_class}kg` : '-'}</span>
                                                <span>{match.home_player?.position || '-'}</span>
                                                <span>{match.home_player?.record || '-'}</span>
                                            </div>
                                        </div>

                                        {/* VS Text (The Impact) */}
                                        <div style={{
                                            fontSize: '4.5rem',
                                            fontStyle: 'italic',
                                            fontWeight: '900',
                                            color: '#FFD700',
                                            textShadow: '0 0 10px #FF4500, 0 0 20px #FF4500, 0 0 40px #EF4444, 4px 4px 4px rgba(0,0,0,0.9)',
                                            transform: 'skew(-10deg) rotate(-5deg)',
                                            zIndex: 10,
                                            margin: '0 -10px' // 간격 좁히기
                                        }}>
                                            VS
                                        </div>

                                        {/* Blue Corner (Opponent) */}
                                        <div
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
                                            onClick={() => router.push(match.match_mode === 'TEAM' || match.sport_type === 'SOCCER' || match.sport_type === 'FUTSAL' || match.sport_type === 'BASEBALL' || match.sport_type === 'BASKETBALL' && match.away_team_id ? `/team/${match.away_team_id}` : `/player/${match.away_player_id}`)}
                                        >
                                            <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: '3px solid #3B82F6', padding: '2px', marginBottom: '12px', boxShadow: '0 0 25px rgba(59, 130, 246, 0.7)' }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                                                    {acceptedApp?.player?.avatar_url ? <img src={acceptedApp.player.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', marginBottom: '6px', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                                {acceptedApp?.player?.name || "Opponent"}
                                            </span>
                                            <div style={{ fontSize: '0.8rem', color: '#D1D5DB', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '500' }}>
                                                <span>{acceptedApp?.player?.weight_class ? `${acceptedApp.player.weight_class}kg` : '-'}</span>
                                                <span>{acceptedApp?.player?.position || '-'}</span>
                                                <span>{acceptedApp?.player?.record || '-'}</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                            </div>
                        </div>
                    </section>

                    {/* New Section: Match Detail Info */}
                    <section style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB', padding: '20px' }}>
                        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', marginBottom: '12px' }}>매치 상세 정보</h2>

                        {/* Specs Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            {isTeamSport ? (
                                (() => {
                                    const LEVEL_MAP: Record<number, string> = {
                                        1: "🐣 Lv.1 갓 태어난 병아리",
                                        2: "🏃 Lv.2 동네 에이스",
                                        3: "🎖️ Lv.3 지역구 강자",
                                        4: "🏆 Lv.4 전국구 고수",
                                        5: "👽 Lv.5 우주 방위대"
                                    };
                                    const levelText = match.team_level ? LEVEL_MAP[match.team_level] : '-';
                                    const genderMap: Record<string, string> = { 'MALE': '남성', 'FEMALE': '여성', 'MIXED': '성별 무관' };

                                    const getColorIcon = (colorLabel: string) => {
                                        const colorCodeMap: Record<string, string> = {
                                            '흰색': '#FFFFFF', '검정': '#000000', '빨강': '#EF4444',
                                            '파랑': '#3B82F6', '노랑': '#EAB308', '형광': '#CCFF00',
                                            '주황': '#F97316', '보라': '#8B5CF6', '초록': '#22C55E'
                                        };
                                        const hex = colorCodeMap[colorLabel];
                                        if (!hex) return null;
                                        return (
                                            <span style={{
                                                display: 'inline-block', width: '12px', height: '12px',
                                                borderRadius: '50%', backgroundColor: hex,
                                                border: (colorLabel === '흰색' || colorLabel === '형광') ? '1px solid #D1D5DB' : 'none',
                                                marginRight: '6px'
                                            }} />
                                        );
                                    };

                                    return (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>경기 방식</span>
                                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_format || '-'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>구장 확보</span>
                                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.has_pitch ? '확보 완료' : '미확보'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>참가비 (팀당)</span>
                                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.cost === 0 ? '무료' : match.cost ? `${match.cost.toLocaleString()}원` : '-'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>성별 및 수준</span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1F2937' }}>
                                                    {genderMap[match.match_gender] || match.match_gender || '-'} / {levelText}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>홈 유니폼</span>
                                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937', display: 'flex', alignItems: 'center' }}>
                                                    {getColorIcon(match.uniform_color)}
                                                    {match.uniform_color || '-'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>어웨이 유니폼</span>
                                                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937', display: 'flex', alignItems: 'center' }}>
                                                    {getColorIcon(acceptedApp?.away_uniform_color)}
                                                    {acceptedApp?.away_uniform_color || '-'}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()
                            ) : (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>체급</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_weight ? `${match.match_weight}kg` : '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>스파링</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_type || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>라운드</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.rounds ? `${match.rounds}R` : '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>보호구</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.gear || '-'}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Tags */}
                        {match.tags && match.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {match.tags.map((tag: string) => (
                                    <span key={tag} style={{
                                        background: '#F3F4F6', color: '#4B5563', fontSize: '0.8rem',
                                        padding: '6px 10px', borderRadius: '8px', fontWeight: '500'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            {match.description ? (
                                <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {match.description}
                                </p>
                            ) : (
                                <p style={{ fontSize: '0.9rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                    등록된 상세 내용이 없습니다.
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Map Section (Added for Scheduled Match) */}
                    {(match.match_mode === 'HOME' && match.home_team?.location) && (
                        <section style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', marginBottom: '12px' }}>
                                매치 장소
                            </h2>
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                <GoogleMapViewer
                                    address={match.home_team!.location!}
                                    height="200px"
                                />
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#374151', display: 'flex', gap: '4px' }}>
                                <span>📍</span>
                                <span>
                                    {
                                        match.match_mode === 'HOME'
                                            ? match.home_team?.location
                                            : (match.match_mode === 'AWAY' ? '원정 경기 (장소 조율 필요)' : (match.match_location || '장소 미정'))
                                    }
                                </span>
                            </div>
                        </section>
                    )}

                    {/* Chat Button */}
                    {(() => {
                        const isApplicant = currentUser?.id && acceptedApp?.applicant_user_id === currentUser.id;
                        const isPlayer = currentUser?.id && acceptedApp?.player?.user_id === currentUser.id; // Correct way to check player ownership
                        const canEnterChat = isHost || isApplicant || isPlayer;

                        if (acceptedApp && canEnterChat) {
                            return (
                                <button
                                    onClick={handleEnterChat}
                                    style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#2563EB', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                >
                                    <span>💬</span> 채팅방 이동하기
                                </button>
                            );
                        }
                        return null;
                    })()}

                    {/* 3. Rejected List (Host Only) */}
                    {isHost && rejectedApps.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6B7280', marginBottom: '16px' }}>거절한 매치 상대</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.7 }}>
                                {rejectedApps.map(app => (
                                    <ApplicationCard key={app.id} app={app} isPending={false} isHost={true} isTeamSport={isTeamSport} />
                                ))}
                            </div>
                        </section>
                    )}

                </main>
            </div >
        );
    }
    // --- END SCHEDULED VIEW ---

    const pendingApps = applicants.filter(a => a.status === 'PENDING');
    const processedApps = applicants.filter(a => a.status !== 'PENDING');

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '140px' }}>
            {/* ... (Original Render for Pending/Apply) ... */}
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #E5E7EB',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 100
            }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        padding: '8px', marginRight: '8px', borderRadius: '50%',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        fontSize: '1.25rem', lineHeight: 1
                    }}
                >
                    ←
                </button>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
                    매치 상세 정보
                </h1>
            </header>

            <main style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Match Host Info (Card) - Always Visible */}
                <section style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    border: '1px solid #E5E7EB',
                    padding: '20px'
                }}>
                    {(() => {
                        const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
                        const currentSport = (match.sport_type || '').toUpperCase();
                        const isTeamSport = TEAM_SPORTS.includes(currentSport);

                        if (isTeamSport) {
                            // --- TEAM SPORT HOST PROFILE ---
                            return (
                                <>
                                    <h2 style={{
                                        fontSize: '0.875rem', fontWeight: 600, color: '#6B7280',
                                        marginBottom: '12px', display: 'flex', alignItems: 'center'
                                    }}>
                                        <span style={{
                                            background: '#EFF6FF', color: 'var(--primary)',
                                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', marginRight: '8px'
                                        }}>HOST</span>
                                        팀 정보
                                    </h2>
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', cursor: 'pointer' }}
                                        onClick={() => router.push(`/team/${match.home_team_id}`)}
                                    >
                                        {/* Team Emblem */}
                                        <div style={{
                                            width: '60px', height: '60px', borderRadius: '50%',
                                            background: '#F9FAFB', border: '1px solid #E5E7EB',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                                            overflow: 'hidden'
                                        }}>
                                            {(match.home_team?.emblem_url) ? (
                                                <img
                                                    src={match.home_team.emblem_url}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : '🛡️'}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#111827', lineHeight: '1.2' }}>
                                                {match.home_team?.team_name || "알 수 없는 팀"}
                                            </p>
                                            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '4px' }}>
                                                주장: {match.home_player?.name || "미정"}
                                                {match.home_team?.description && ` | ${match.home_team.description}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', color: '#374151', fontSize: '0.9rem' }}>
                                            <span style={{ width: '24px', marginRight: '8px', textAlign: 'center' }}>📅</span>
                                            <span style={{ fontWeight: 500 }}>{new Date(match.match_date).toLocaleDateString()}</span>
                                            <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
                                            <span>{new Date(match.match_date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                        </div>
                                        <div style={{ display: 'flex', color: '#374151', fontSize: '0.9rem', alignItems: 'flex-start' }}>
                                            <span style={{ width: '24px', marginRight: '8px', textAlign: 'center', marginTop: '1px' }}>📍</span>
                                            <span style={{ lineHeight: '1.4' }}>
                                                {match.match_mode === 'HOME' && match.home_team?.location
                                                    ? match.home_team.location
                                                    : (match.match_location || "장소 미정")}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            );
                        } else {
                            // --- ORIGINAL HOST PROFILE (Individual) ---
                            return (
                                <>
                                    <h2 style={{
                                        fontSize: '0.875rem', fontWeight: 600, color: '#6B7280',
                                        marginBottom: '12px', display: 'flex', alignItems: 'center'
                                    }}>
                                        <span style={{
                                            background: '#EFF6FF', color: 'var(--primary)',
                                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', marginRight: '8px'
                                        }}>HOST</span>
                                        상대 정보
                                    </h2>
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', cursor: 'pointer' }}
                                        onClick={() => router.push(`/player/${match.home_player_id}`)}
                                    >
                                        {/* Avatar Placeholder */}
                                        <div style={{
                                            width: '56px', height: '56px', borderRadius: '50%',
                                            background: '#F3F4F6', border: '1px solid #E5E7EB',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                                            overflow: 'hidden'
                                        }}>
                                            {(match.home_player?.avatar_url) ? (
                                                <img
                                                    src={match.home_player?.avatar_url}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : '🛡️'}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', lineHeight: '1.2' }}>
                                                {match.home_player?.name || "알 수 없음"}
                                            </p>
                                            <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' }}>
                                                {match.home_player?.team_members?.[0]?.team?.team_name || "소속 없음"}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', color: '#374151', fontSize: '0.9rem' }}>
                                            <span style={{ width: '24px', marginRight: '8px', textAlign: 'center' }}>📅</span>
                                            <span style={{ fontWeight: 500 }}>{new Date(match.match_date).toLocaleDateString()}</span>
                                            <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
                                            <span>{new Date(match.match_date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                        </div>
                                        <div style={{ display: 'flex', color: '#374151', fontSize: '0.9rem', alignItems: 'flex-start' }}>
                                            <span style={{ width: '24px', marginRight: '8px', textAlign: 'center', marginTop: '1px' }}>📍</span>
                                            <span style={{ lineHeight: '1.4' }}>
                                                {match.match_location || "장소 미정"}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            );
                        }
                    })()}
                </section>

                {/* Map Section - Show only for Home Matches */}
                {(match.match_mode === 'HOME' && match.home_team?.location) && (
                    <section style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                            매치 장소
                        </h3>
                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                            <GoogleMapViewer
                                address={match.home_team!.location!}
                                height="200px"
                            />
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6B7280' }}>
                            📍 {
                                match.match_mode === 'HOME'
                                    ? match.home_team?.location
                                    : (match.match_mode === 'AWAY' ? '원정 경기 (장소 조율 필요)' : (match.match_location || '장소 미정'))
                            }
                        </div>
                    </section>
                )}

                {/* New Section: Match Detail Info */}
                <section style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB', padding: '20px' }}>
                    <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', marginBottom: '12px' }}>매치 상세 정보</h2>

                    {/* Specs Grid */}
                    {(() => {
                        const TEAM_SPORTS = ['SOCCER', 'FUTSAL', 'BASEBALL', 'BASKETBALL'];
                        const currentSport = (match.sport_type || '').toUpperCase();
                        const isTeamSport = TEAM_SPORTS.includes(currentSport);

                        if (isTeamSport) {
                            // Team Sport Specs
                            const LEVEL_MAP: Record<number, string> = {
                                1: "🐣 Lv.1 병아리",
                                2: "🏃 Lv.2 동네 에이스",
                                3: "🎖️ Lv.3 지역구 강자",
                                4: "🏆 Lv.4 전국구 고수",
                                5: "👽 Lv.5 우주방위대"
                            };
                            const levelText = match.team_level ? LEVEL_MAP[match.team_level] : '-';
                            const genderMap: Record<string, string> = { 'MALE': '남성', 'FEMALE': '여성', 'MIXED': '혼성' };

                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>참가비 (팀당)</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>
                                            {match.cost === 0 ? '무료' : `${(match.cost || 0).toLocaleString()}원`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>홈 유니폼</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {(() => {
                                                const color = match.uniform_color || '미정';
                                                const colorCodeMap: Record<string, string> = {
                                                    '흰색': '#FFFFFF',
                                                    '검정': '#000000',
                                                    '빨강': '#EF4444',
                                                    '파랑': '#3B82F6',
                                                    '노랑': '#EAB308',
                                                    '형광': '#CCFF00',
                                                    '주황': '#F97316',
                                                    '보라': '#8B5CF6',
                                                    '초록': '#22C55E'
                                                };
                                                const bg = colorCodeMap[color] || '#9CA3AF';
                                                const isWhite = color === '흰색' || color === '형광'; // Add border for light colors

                                                return (
                                                    <span style={{
                                                        display: 'inline-block',
                                                        width: '14px', height: '14px',
                                                        borderRadius: '50%',
                                                        backgroundColor: bg,
                                                        border: isWhite ? '1px solid #E5E7EB' : 'none',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }} />
                                                );
                                            })()}
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.uniform_color || '미정'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>성별</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>
                                            {genderMap[match.match_gender] || match.match_gender || '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>경기 방식</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_format || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>구장 확보</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>
                                            {match.has_pitch ? '구장 확보' : '원정/미확보'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>팀 수준</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1F2937' }}>{levelText}</span>
                                    </div>
                                </div>
                            );
                        } else {
                            // Original Specs (Individual)
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>체급</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_weight ? `${match.match_weight}kg` : '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>스파링</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.match_type || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>라운드</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.rounds ? `${match.rounds}R` : '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>보호구</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>{match.gear || '-'}</span>
                                    </div>
                                </div>
                            );
                        }
                    })()}

                    {/* Tags */}
                    {match.tags && match.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            {match.tags.map((tag: string) => (
                                <span key={tag} style={{
                                    background: '#F3F4F6', color: '#4B5563', fontSize: '0.8rem',
                                    padding: '6px 10px', borderRadius: '8px', fontWeight: '500'
                                }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        {match.description ? (
                            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {match.description}
                            </p>
                        ) : (
                            <p style={{ fontSize: '0.9rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                등록된 상세 내용이 없습니다.
                            </p>
                        )}
                    </div>
                </section>

                {/* Application Form - Hide if Host */}
                {/* Application Form Placeholder - Link to Apply Page */}


                {/* Applicants List - Always Visible */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Pending Applications Section */}
                    <section>
                        <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                            대기 중인 신청
                            <span style={{ color: 'var(--primary)' }}>{pendingApps.length}건</span>
                        </h2>

                        {pendingApps.length === 0 ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF', background: 'white', borderRadius: '12px' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                                <p>새로운 신청이 없습니다.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {pendingApps.map(app => (
                                    <ApplicationCard
                                        key={app.id}
                                        app={app}
                                        onChat={() => handleStartChat(app.applicant_user_id, app.applicant_player_id, app.applicant_team_id)}
                                        onAccept={() => handleUpdateStatus(app.id, 'ACCEPTED')}
                                        onReject={() => handleUpdateStatus(app.id, 'REJECTED')}
                                        onCancel={(currentUser?.id === app.applicant_user_id || currentUser?.id === app.player?.user_id) ? () => handleCancelApplication(app.id) : undefined}
                                        isPending={true}
                                        isHost={isHost}
                                        isTeamSport={isTeamSport}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Processed (Rejected/Accepted) List */}
                    {processedApps.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6B7280', marginBottom: '16px' }}>
                                처리된 목록
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.8 }}>
                                {processedApps.map(app => (
                                    <ApplicationCard
                                        key={app.id}
                                        app={app}
                                        isPending={false}
                                        isHost={isHost}
                                        isTeamSport={isTeamSport}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Application Form Placeholder - Link to Apply Page (Moved to Bottom) */}
                {!isHost && isCaptain && (
                    <section style={{
                        background: 'white', borderRadius: '16px', padding: '24px',
                        textAlign: 'center', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        marginTop: '16px'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                            매치에 추가 참여신청을 하시고 싶으신가요?
                        </h3>
                        <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '0.85rem' }}>
                            관장님은 산하 선수의 추가 신청을 할 수 있습니다.
                        </p>
                        <button
                            onClick={() => router.push(`/matches/${matchId}/apply`)}
                            style={{
                                background: 'var(--primary)', color: 'white',
                                padding: '14px 24px', borderRadius: '12px',
                                fontSize: '1rem', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            매칭 추가 신청하러 가기
                        </button>
                    </section>
                )}
            </main>

            {/* Bottom CTA */}

        </div>
    );
}

function ApplicationCard({ app, onChat, onAccept, onReject, onCancel, isPending, isHost, isTeamSport }: { app: any, onChat?: () => void, onAccept?: () => void, onReject?: () => void, onCancel?: () => void, isPending: boolean, isHost: boolean, isTeamSport: boolean }) {
    const router = useRouter();
    const player = app.player;
    const appTeam = app.applicant_team; // Newly joined team info

    // Display Logic
    const displayTeamName = isTeamSport ? (appTeam?.team_name || "팀 정보 없음") : (player?.team_members?.[0]?.team?.team_name || "소속 없음");
    const displayEmblem = isTeamSport ? appTeam?.emblem_url : player?.avatar_url;
    const displayDesc = isTeamSport ? appTeam?.description : "";
    const displayTitle = isTeamSport ? displayTeamName : (player?.name || "알 수 없음");
    const captainName = player?.name;

    // Structured Data
    const uniformColor = app.away_uniform_color;
    const memberCount = app.participant_count;

    // Uniform Color Swatch Helper
    const getUndoColor = (colorName: string) => {
        const colorCodeMap: Record<string, string> = {
            '흰색': '#FFFFFF', '검정': '#000000', '빨강': '#EF4444', '파랑': '#3B82F6',
            '노랑': '#EAB308', '형광': '#CCFF00', '주황': '#F97316', '보라': '#8B5CF6', '초록': '#22C55E'
        };
        return colorCodeMap[colorName] || '#9CA3AF';
    };
    const uniformHex = getUndoColor(uniformColor);
    const isWhite = uniformColor === '흰색' || uniformColor === '형광';

    return (
        <div
            style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #E5E7EB',
                cursor: 'pointer'
            }}
            onClick={() => router.push(isTeamSport && app.applicant_team_id ? `/team/${app.applicant_team_id}` : `/player/${app.applicant_player_id}`)}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: '#F3F4F6', overflow: 'hidden', flexShrink: 0,
                    border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {displayEmblem ? (
                        <img src={displayEmblem} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ fontSize: '2rem' }}>{isTeamSport ? '🛡️' : '👤'}</div>
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                                {displayTitle}
                            </h3>
                            {isTeamSport ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <p style={{ fontSize: '0.9rem', color: '#4B5563', fontWeight: '500' }}>
                                        주장: {captainName}
                                    </p>
                                    {displayDesc && (
                                        <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                            {displayDesc}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                    {displayTeamName}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            {!isPending && (
                                <span style={{
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                                    background: app.status === 'ACCEPTED' ? '#ECFDF5' : '#F3F4F6',
                                    color: app.status === 'ACCEPTED' ? '#059669' : '#9CA3AF'
                                }}>
                                    {app.status === 'ACCEPTED' ? '승인됨' : '거절됨'}
                                </span>
                            )}

                            {/* Cancel Button (For Applicant) */}
                            {isPending && onCancel && (
                                <button
                                    onClick={onCancel}
                                    style={{
                                        border: 'none', background: '#F3F4F6',
                                        color: '#6B7280', fontSize: '0.75rem', cursor: 'pointer',
                                        padding: '4px 8px', borderRadius: '6px', fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    취소
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        {isTeamSport ? (
                            <>
                                {uniformColor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F9FAFB', padding: '4px 10px', borderRadius: '6px', color: '#374151', border: '1px solid #F3F4F6' }}>
                                        <span style={{ color: '#9CA3AF' }}>유니폼:</span>
                                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: uniformHex, border: isWhite ? '1px solid #E5E7EB' : 'none' }} />
                                        <span style={{ fontWeight: 600 }}>{uniformColor}</span>
                                    </div>
                                )}
                                {memberCount > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F9FAFB', padding: '4px 10px', borderRadius: '6px', color: '#374151', border: '1px solid #F3F4F6' }}>
                                        <span style={{ color: '#9CA3AF' }}>참여:</span>
                                        <span style={{ fontWeight: 600 }}>🏃‍♂️ {memberCount}명</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <span style={{ background: '#F9FAFB', padding: '4px 8px', borderRadius: '6px', color: '#374151' }}>
                                체급: {app.application_weight || player?.weight_class || '-'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {app.message && (
                <div style={{
                    background: '#F9FAFB', padding: '12px', borderRadius: '8px',
                    fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.5',
                    marginBottom: isPending && isHost ? '20px' : '0'
                }}>
                    "{app.message}"
                </div>
            )}

            {isPending && isHost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: app.message ? 0 : 20 }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onChat && onChat(); }}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '10px',
                            background: 'var(--primary)', color: 'white',
                            border: 'none', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <span>💬</span> 대화하기
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAccept && onAccept(); }}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '10px',
                                background: 'white', color: '#059669',
                                border: '1px solid #D1FAE5', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                            }}
                        >
                            ✅ 수락
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onReject && onReject(); }}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '10px',
                                background: 'white', color: '#EF4444',
                                border: '1px solid #FEE2E2', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer'
                            }}
                        >
                            ❌ 거절
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
