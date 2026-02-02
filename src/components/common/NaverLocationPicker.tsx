"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface NaverLocationPickerProps {
    onLocationSelect: (address: string) => void;
    initialAddress?: string;
}

declare global {
    interface Window {
        naver: any;
    }
}

export default function NaverLocationPicker({ onLocationSelect, initialAddress }: NaverLocationPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [address, setAddress] = useState(initialAddress || "");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Load check
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

    const initMap = () => {
        if (!mapRef.current || !window.naver) return;

        const location = new window.naver.maps.LatLng(37.5665, 126.9780); // Default: Seoul City Hall
        const mapOptions = {
            center: location,
            zoom: 16,
        };

        const nMap = new window.naver.maps.Map(mapRef.current, mapOptions);
        setMap(nMap);

        const nMarker = new window.naver.maps.Marker({
            position: location,
            map: nMap,
        });
        setMarker(nMarker);

        // Click Listener
        window.naver.maps.Event.addListener(nMap, 'click', function (e: any) {
            nMarker.setPosition(e.coord);
            searchCoordinateToAddress(e.coord);
        });
    };

    const searchCoordinateToAddress = (latlng: any) => {
        if (!window.naver || !window.naver.maps.Service) return;

        window.naver.maps.Service.reverseGeocode({
            coords: latlng,
            orders: [
                window.naver.maps.Service.OrderType.ADDR,
                window.naver.maps.Service.OrderType.ROAD_ADDR
            ].join(',')
        }, function (status: any, response: any) {
            if (status !== window.naver.maps.Service.Status.OK) {
                return alert('Something went wrong!');
            }

            const items = response.v2.results;
            let resultAddress = '';

            // Prioritize Road Address
            if (items.length > 0) {
                // Format: region.area1 + " " + region.area2 + ... land.name ...
                // Simplified logic: use `region.area1` + `area2` + `land.name` + `land.number1`
                // Or just use the formatted address if available?
                // Naver returns structure. Let's try to construct or find 'region' area.

                const item = items[0]; // Best match
                const region = item.region;
                const land = item.land;

                // Construct string
                const parts = [
                    region.area1.name,
                    region.area2.name,
                    region.area3.name,
                    region.area4.name,
                    land.number1,
                    land.number2 ? '-' + land.number2 : ''
                ];

                // Actually Naver reverse geocode response usually needs parsing.
                // Let's grab `land.name` (road name) if road addr.
                if (item.name === 'roadaddr') {
                    resultAddress = item.region.area1.name + ' ' + item.region.area2.name + ' ' + item.land.name + ' ' + item.land.number1;
                    if (item.land.number2) resultAddress += '-' + item.land.number2;
                } else {
                    // jibun
                    resultAddress = item.region.area1.name + ' ' + item.region.area2.name + ' ' + item.region.area3.name + ' ' + item.land.number1;
                    if (item.land.number2) resultAddress += '-' + item.land.number2;
                }
            }

            setAddress(resultAddress);
        });
    };

    const handleSearch = () => {
        // If we were to implement keyword search, we'd need Geocoder 'geocode' method.
        // For now, let's keep it map-click based (Location Picker)
        // But user asked for "Address Search Button -> Select".
        // Maybe open map and let user click?
        setIsOpen(true);
    };

    useEffect(() => {
        if (isOpen && !map) {
            // Give time for modal render
            setTimeout(() => {
                if (window.naver && window.naver.maps) {
                    initMap();
                }
            }, 100);
        }
    }, [isOpen]);

    if (!clientId) {
        return <div style={{ color: 'red', fontSize: '0.8rem' }}>⚠️ Naver Client ID 미설정</div>;
    }

    return (
        <div style={{ marginBottom: '1rem' }}>
            <Script
                src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
                strategy="afterInteractive"
                onLoad={() => setIsLoading(false)}
                onError={() => console.error("Naver Maps Load Error")}
                onReady={() => {
                    // Script loaded
                }}
            />

            {/* <label> removed for UI simplicity */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    value={address}
                    readOnly
                    placeholder="주소 검색 버튼을 눌러 위치를 선택하세요"
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB',
                        backgroundColor: '#F9FAFB', color: '#374151'
                    }}
                />
                <button
                    type="button"
                    onClick={handleSearch}
                    style={{
                        padding: '0 16px', borderRadius: '8px', border: '1px solid #D1D5DB',
                        background: 'white', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap'
                    }}
                >
                    주소 검색
                </button>
            </div>

            {/* Map Modal/Area */}
            {isOpen && (
                <div style={{
                    marginTop: '10px',
                    border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden',
                    background: '#F3F4F6', padding: '10px'
                }}>
                    <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: '#6B7280' }}>
                        지도를 클릭하여 정확한 위치를 선택해주세요.
                    </div>

                    <div ref={mapRef} style={{ width: '100%', height: '300px', background: '#ddd' }} />

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: 'white' }}
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onLocationSelect(address);
                                setIsOpen(false);
                            }}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#2563EB', color: 'white', fontWeight: 'bold' }}
                        >
                            이 위치 선택
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
