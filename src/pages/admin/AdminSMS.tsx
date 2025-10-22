import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { GlobalSMSManager } from '@/components/GlobalSMSManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

const AdminSMS = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number']);

      if (error) throw error;

      const settings = data?.reduce((acc, setting) => {
        if (setting.key === 'twilio_account_sid') acc.accountSid = setting.value || '';
        if (setting.key === 'twilio_auth_token') acc.authToken = setting.value || '';
        if (setting.key === 'twilio_phone_number') acc.phoneNumber = setting.value || '';
        return acc;
      }, { accountSid: '', authToken: '', phoneNumber: '' });

      setCredentials(settings || { accountSid: '', authToken: '', phoneNumber: '' });
    } catch (error: any) {
      console.error('Error loading SMS settings:', error);
      toast.error('Failed to load SMS settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'twilio_account_sid', value: credentials.accountSid },
        { key: 'twilio_auth_token', value: credentials.authToken },
        { key: 'twilio_phone_number', value: credentials.phoneNumber }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success('SMS settings saved successfully');
    } catch (error: any) {
      console.error('Error saving SMS settings:', error);
      toast.error('Failed to save SMS settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div>
          <h1 className="text-3xl font-bold">SMS Management</h1>
          <p className="text-muted-foreground">Configure Twilio credentials and send bulk SMS notifications</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Twilio Configuration</CardTitle>
            <CardDescription>
              Configure your Twilio account credentials for SMS notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accountSid">Account SID</Label>
                  <Input
                    id="accountSid"
                    type="text"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={credentials.accountSid}
                    onChange={(e) => setCredentials({ ...credentials, accountSid: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authToken">Auth Token</Label>
                  <Input
                    id="authToken"
                    type="password"
                    placeholder="Your Twilio Auth Token"
                    value={credentials.authToken}
                    onChange={(e) => setCredentials({ ...credentials, authToken: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1234567890"
                    value={credentials.phoneNumber}
                    onChange={(e) => setCredentials({ ...credentials, phoneNumber: e.target.value })}
                  />
                </div>

                <Button onClick={saveSettings} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <GlobalSMSManager />
      </div>
    </DashboardLayout>
  );
};

export default AdminSMS;
