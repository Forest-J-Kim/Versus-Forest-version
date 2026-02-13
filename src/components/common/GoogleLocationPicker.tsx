"use client";

import React, { useEffect, useState, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader, Autocomplete, Libraries } from '@react-google-maps/api';

// Define libraries as a static constant to avoid reloading
const libraries: Libraries = ["places"];

interface GoogleLocationPickerProps {
    initialAddress?: string;
    onLocationSelect: (address: string, lat: number, lng: number) => void;
}

export default function GoogleLocationPicker({ initialAddress, onLocationSelect }: GoogleLocationPickerProps) {
    const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.9780 });
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    // Google Maps API
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: libraries,
        language: 'ko',
        region: 'KR',
    });

    // Effect: Resolve initial address to coordinates
    useEffect(() => {
        if (isLoaded && initialAddress) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: initialAddress }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const loc = results[0].geometry.location;
                    setCenter({ lat: loc.lat(), lng: loc.lng() });
                }
            });
        }
    }, [isLoaded, initialAddress]);

    const onLoadAutocomplete = (auto: google.maps.places.Autocomplete) => {
        setAutocomplete(auto);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const address = place.formatted_address || place.name || "";

                // 1. Map Center Move
                setCenter({ lat, lng });

                // 2. Parent Callback
                onLocationSelect(address, lat, lng);
            } else {
                alert("장소 정보를 찾을 수 없습니다. (상세 주소를 선택해주세요)");
            }
        }
    };

    if (!isLoaded) {
        return (
            <div style={{ padding: '20px', background: '#F3F4F6', borderRadius: '12px', textAlign: 'center', color: '#6B7280' }}>
                지도 로딩 중...
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            {/* Search Input */}
            <div style={{ marginBottom: '12px' }}>
                <Autocomplete
                    onLoad={onLoadAutocomplete}
                    onPlaceChanged={onPlaceChanged}
                >
                    <input
                        type="text"
                        placeholder="장소 또는 주소 검색 (예: 강남역, 서울시청)"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid #D1D5DB',
                            fontSize: '1rem',
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        defaultValue={initialAddress}
                    />
                </Autocomplete>
            </div>

            {/* Map Display */}
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '300px', borderRadius: '12px', border: '1px solid #E5E7EB' }}
                center={center}
                zoom={15}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                }}
            >
                <Marker position={center} />
            </GoogleMap>
        </div>
    );
}
