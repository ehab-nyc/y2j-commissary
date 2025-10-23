import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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
  const [isLoading, setIsLoading] = useState(true);

  // Load Mapbox token from secure edge function
  useEffect(() => {
    const loadToken = async () => {
      try {
        // Check if user is authenticated first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No active session - user must be logged in to view maps');
          setIsLoading(false);
          return;
        }

        console.log('Fetching Mapbox token with authenticated session...');
        
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error fetching mapbox token:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
        } else if (data?.configured && data?.token) {
          console.log('Mapbox token received successfully');
          setMapboxToken(data.token);
        } else {
          console.log('Mapbox token not configured:', data);
        }
      } catch (error) {
        console.error('Failed to load mapbox token:', error);
      } finally {
        setIsLoading(false);
      }
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

  // Token is now managed via secrets by administrators

  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h3 className="text-lg font-semibold">Map Service Not Configured</h3>
          <p className="text-sm text-muted-foreground">
            The Mapbox service has not been configured. Please contact your administrator to set up the MAPBOX_TOKEN in system settings.
          </p>
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
