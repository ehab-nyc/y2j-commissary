import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { GlobalSMSManager } from '@/components/GlobalSMSManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const AdminSMS = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div>
          <h1 className="text-3xl font-bold">SMS Management</h1>
          <p className="text-muted-foreground">Send bulk SMS notifications to customers and staff</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Twilio Configuration</CardTitle>
            <CardDescription>
              SMS credentials are managed securely through environment variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Twilio credentials (Account SID, Auth Token, and Phone Number) are now managed through secure environment variables for enhanced security. These credentials are no longer stored in the database.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <GlobalSMSManager />
      </div>
    </DashboardLayout>
  );
};

export default AdminSMS;
