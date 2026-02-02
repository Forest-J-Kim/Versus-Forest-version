"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface NaverMapViewerProps {
    address: string;
}

export default function NaverMapViewer({ address }: NaverMapViewerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false); // Refresh
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

    useEffect(() => {
        if (isLoaded && address && window.naver && mapRef.current) {
            geocodeAndDraw();
        }
    }, [isLoaded, address]);

    const geocodeAndDraw = () => {
        if (!window.naver.maps.Service) return;

        window.naver.maps.Service.geocode({
            query: address
        }, function (status: any, response: any) {
            if (status !== window.naver.maps.Service.Status.OK) {
                return console.error('Geocode Error');
            }

            const result = response.v2.addresses[0];
            if (!result) return;

            const coords = new window.naver.maps.LatLng(result.y, result.x);

            const map = new window.naver.maps.Map(mapRef.current, {
                center: coords,
                zoom: 16,
                draggable: false,
                scrollWheel: false,
                keyboardShortcuts: false,
                disableDoubleTapZoom: true,
                disableDoubleClickZoom: true,
                disableTwoFingerTapZoom: true
            });

            new window.naver.maps.Marker({
                position: coords,
                map: map
            });
            setIsLoading(false);
        });
    };

    if (!clientId) return null;

    return (
        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB', marginTop: '1rem' }}>
            <Script
                src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
                strategy="afterInteractive"
                onReady={() => setIsLoaded(true)}
            />
            {isLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#888', background: '#f9f9f9' }}>지도 로딩 중...</div>}

            <div style={{ padding: '12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '0.9rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📍</span>
                <span style={{ fontWeight: 600 }}>{address}</span>
            </div>

            <div ref={mapRef} style={{ width: '100%', height: '250px', display: isLoading ? 'none' : 'block' }} />
        </div>
    );
}
