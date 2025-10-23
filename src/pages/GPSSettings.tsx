import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Settings, Key, Map, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GPSSettings = () => {
  const [gpsApiKey, setGpsApiKey] = useState('');
  const [gpsApiUrl, setGpsApiUrl] = useState('');
  const [mapboxConfigured, setMapboxConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
    checkMapboxToken();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('gps_settings')
      .select('*')
      .in('key', ['gps_api_key', 'gps_api_url']);

    if (data) {
      data.forEach((setting) => {
        if (setting.key === 'gps_api_key') setGpsApiKey(setting.value);
        if (setting.key === 'gps_api_url') setGpsApiUrl(setting.value);
      });
    }
  };

  const checkMapboxToken = async () => {
    try {
      const { data } = await supabase.functions.invoke('get-mapbox-token');
      if (data?.configured) {
        setMapboxConfigured(true);
      }
    } catch (error) {
      console.error('Error checking mapbox token:', error);
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
                  <Lock className="h-5 w-5" />
                  Secure Mapbox Configuration
                </CardTitle>
                <CardDescription>
                  Mapbox token is now securely managed via system secrets for enhanced security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mapboxConfigured ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertTitle>Mapbox Token Configured</AlertTitle>
                    <AlertDescription>
                      The Mapbox service is properly configured and ready to use. The token is securely stored server-side.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTitle>Mapbox Token Not Configured</AlertTitle>
                    <AlertDescription>
                      To enable map features, an administrator must add the MAPBOX_TOKEN secret via the system settings.
                      <br /><br />
                      <strong>For administrators:</strong>
                      <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li>Get your free Mapbox public token from <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a></li>
                        <li>Contact your system administrator to add the token as a secret named "MAPBOX_TOKEN"</li>
                        <li>The token will be securely stored and only accessible server-side</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Security Benefits
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✓ Token stored server-side only</li>
                    <li>✓ Not accessible via browser network traffic</li>
                    <li>✓ Requires staff authentication to access</li>
                    <li>✓ Reduced risk of token exposure</li>
                  </ul>
                </div>
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
