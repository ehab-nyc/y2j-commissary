import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    lng: number;
    lat: number;
    label: string;
    color?: string;
  }>;
  onMapClick?: (lng: number, lat: number) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center = [-74.0060, 40.7128], // Default to NYC
  zoom = 12,
  markers = [],
  onMapClick
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load Mapbox token from settings
  useEffect(() => {
    const loadToken = async () => {
      const { data } = await supabase
        .from('gps_settings')
        .select('value')
        .eq('key', 'mapbox_token')
        .maybeSingle();
      
      if (data?.value) {
        setMapboxToken(data.value);
      }
      setIsLoading(false);
    };
    loadToken();
  }, []);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, center, zoom, onMapClick]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = markerData.color || '#3b82f6';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerData.lng, markerData.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${markerData.label}</strong>`))
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [markers]);

  const handleSaveToken = async () => {
    const { error } = await supabase
      .from('gps_settings')
      .upsert({ key: 'mapbox_token', value: tokenInput }, { onConflict: 'key' });
    
    if (!error) {
      setMapboxToken(tokenInput);
      setTokenInput('');
    }
  };

  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="max-w-md space-y-4">
          <h3 className="text-lg font-semibold">Mapbox Token Required</h3>
          <p className="text-sm text-muted-foreground">
            To display the map, you need a Mapbox public token. Get your free token at{' '}
            <a 
              href="https://mapbox.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveToken} className="w-full">
            Save Token
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg shadow-lg" />
    </div>
  );
};

export default MapComponent;
