import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { GlobalSMSManager } from '@/components/GlobalSMSManager';

const AdminSMS = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div>
          <h1 className="text-3xl font-bold">SMS Management</h1>
          <p className="text-muted-foreground">Send bulk SMS notifications to customers</p>
        </div>

        <GlobalSMSManager />
      </div>
    </DashboardLayout>
  );
};

export default AdminSMS;
