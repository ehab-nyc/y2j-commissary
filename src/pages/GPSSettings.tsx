import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Key, Map } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GPSSettings = () => {
  const [mapboxToken, setMapboxToken] = useState('');
  const [gpsApiKey, setGpsApiKey] = useState('');
  const [gpsApiUrl, setGpsApiUrl] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('gps_settings')
      .select('*')
      .in('key', ['mapbox_token', 'gps_api_key', 'gps_api_url']);

    if (data) {
      data.forEach((setting) => {
        if (setting.key === 'mapbox_token') setMapboxToken(setting.value);
        if (setting.key === 'gps_api_key') setGpsApiKey(setting.value);
        if (setting.key === 'gps_api_url') setGpsApiUrl(setting.value);
      });
    }
  };

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('gps_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      toast.error('Failed to save setting');
    } else {
      toast.success('Setting saved successfully');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/gps" label="Back to GPS Hub" />
        <div>
          <h1 className="text-3xl font-bold">GPS Settings</h1>
          <p className="text-muted-foreground">Configure tracking and API integrations</p>
        </div>

        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              Map Settings
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Key className="h-4 w-4" />
              GPS API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Mapbox Configuration
                </CardTitle>
                <CardDescription>
                  Get your free Mapbox public token at{' '}
                  <a 
                    href="https://mapbox.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    mapbox.com
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
                  <Input
                    id="mapbox-token"
                    type="text"
                    placeholder="pk.eyJ..."
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    This token is used to display maps throughout the GPS tracking system
                  </p>
                </div>
                <Button onClick={() => saveSetting('mapbox_token', mapboxToken)}>
                  Save Mapbox Token
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Commercial GPS API
                </CardTitle>
                <CardDescription>
                  Configure your commercial GPS tracking service API (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gps-api-url">GPS API URL</Label>
                  <Input
                    id="gps-api-url"
                    type="text"
                    placeholder="https://api.gps-provider.com/v1"
                    value={gpsApiUrl}
                    onChange={(e) => setGpsApiUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gps-api-key">GPS API Key</Label>
                  <Input
                    id="gps-api-key"
                    type="password"
                    placeholder="Enter your GPS provider API key"
                    value={gpsApiKey}
                    onChange={(e) => setGpsApiKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is used to fetch data from commercial GPS tracking devices
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    saveSetting('gps_api_url', gpsApiUrl);
                    saveSetting('gps_api_key', gpsApiKey);
                  }}>
                    Save GPS API Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supported GPS Providers</CardTitle>
                <CardDescription>
                  Popular GPS tracking services that can be integrated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Geotab - Enterprise fleet tracking</li>
                  <li>• Verizon Connect - Real-time GPS tracking</li>
                  <li>• Samsara - IoT fleet management</li>
                  <li>• Fleet Complete - Fleet tracking</li>
                  <li>• GPS Insight - Real-time tracking</li>
                  <li>• Mobile app tracking (built-in, no API needed)</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default GPSSettings;
