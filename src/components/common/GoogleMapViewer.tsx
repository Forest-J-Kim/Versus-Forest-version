"use client";

import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader, Libraries } from '@react-google-maps/api';

const libraries: Libraries = ["places"];

const containerStyle = {
    width: '100%',
    borderRadius: '12px', // 둥근 모서리 디자인
};

interface GoogleMapViewerProps {
    address: string;
    height?: string;
}

export default function GoogleMapViewer({ address, height = '300px' }: GoogleMapViewerProps) {
    const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [mapError, setMapError] = useState(false);

    // 1. Google Maps API 로드
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", // .env.local 확인 필요
        libraries: libraries,
        language: 'ko',
        region: 'KR',
    });

    // 2. 주소 -> 좌표 변환 (Geocoding)
    useEffect(() => {
        if (!isLoaded || !address) return;

        // Type assertion for Google Maps globals
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                setCenter({ lat: location.lat(), lng: location.lng() });
            } else {
                console.error('Geocode failed: ' + status);
                setMapError(true);
            }
        });
    }, [isLoaded, address]);

    // UI 1: 로딩 중 (API Not Loaded)
    if (!isLoaded) {
        return (
            <div style={{ height, width: '100%', background: '#F3F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                지도 로딩 중...
            </div>
        );
    }

    // UI 2: 주소 찾기 실패 (Map Error or No Center)
    if (mapError || !center) {
        // If loaded but waiting for geocoding (center is null but no error yet), show loading
        if (!mapError && !center) {
            return (
                <div style={{ height, width: '100%', background: '#F3F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                    위치 확인 중...
                </div>
            );
        }

        return (
            <div style={{ height, width: '100%', background: '#F3F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.9rem', flexDirection: 'column', gap: '8px' }}>
                <span>🗺️ 위치 정보를 불러올 수 없습니다.</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({address})</span>
            </div>
        );
    }

    // UI 3: 지도 표시
    return (
        <GoogleMap
            mapContainerStyle={{ ...containerStyle, height }}
            center={center}
            zoom={15}
            options={{
                disableDefaultUI: true, // 복잡한 버튼 숨김
                zoomControl: true,      // 줌 버튼은 표시
            }}
        >
            <Marker position={center} />
        </GoogleMap>
    );
}
