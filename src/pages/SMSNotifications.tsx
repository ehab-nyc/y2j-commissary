import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { MessageSquare, Send, Settings, History } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface SMSTemplate {
  id: string;
  name: string;
  template_key: string;
  message_template: string;
  is_active: boolean;
}

interface SMSLog {
  id: string;
  phone_number: string;
  message_type: string;
  sent_at: string;
}

export default function SMSNotifications() {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchRecentLogs();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('sms_templates')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to fetch SMS templates');
      console.error(error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const fetchRecentLogs = async () => {
    const { data, error } = await supabase
      .from('sms_rate_limit')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching SMS logs:', error);
    } else {
      setLogs(data || []);
    }
  };

  const handleToggleTemplate = async (templateId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('sms_templates')
      .update({ is_active: !currentStatus })
      .eq('id', templateId);

    if (error) {
      toast.error('Failed to update template status');
      console.error(error);
    } else {
      toast.success(`Template ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchTemplates();
    }
  };

  const handleUpdateTemplate = async (templateId: string) => {
    if (!editText.trim()) {
      toast.error('Template message cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('sms_templates')
      .update({
        message_template: editText,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);

    if (error) {
      toast.error('Failed to update template');
      console.error(error);
    } else {
      toast.success('Template updated successfully');
      setEditingTemplate(null);
      setEditText('');
      fetchTemplates();
    }
  };

  const startEditing = (template: SMSTemplate) => {
    setEditingTemplate(template.id);
    setEditText(template.message_template);
  };

  const cancelEditing = () => {
    setEditingTemplate(null);
    setEditText('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <BackButton />
          <h1 className="text-3xl font-bold mt-2">SMS Notifications</h1>
          <p className="text-muted-foreground">Manage SMS notification templates and settings</p>
        </div>

        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            SMS notifications are automatically sent based on order status changes and other events. 
            Customize templates below using variables like {'{{customer_name}}'}, {'{{order_id}}'}, and {'{{total}}'}.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              SMS Templates
            </CardTitle>
            <CardDescription>
              Customize notification messages for different events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Key: <code className="bg-muted px-1 py-0.5 rounded">{template.template_key}</code>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleTemplate(template.id, template.is_active)}
                        />
                        <span className="text-sm">
                          {template.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {editingTemplate === template.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          placeholder="Enter message template..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTemplate(template.id)}
                          >
                            Save Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-muted p-3 rounded text-sm">
                          {template.message_template}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(template)}
                        >
                          Edit Template
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent SMS Activity
            </CardTitle>
            <CardDescription>
              Last 10 SMS notifications sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No SMS messages sent yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.sent_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {log.phone_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.message_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Available Template Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Use these variables in your templates - they'll be replaced with actual values:</p>
            <div className="grid md:grid-cols-2 gap-2 mt-2">
              <code className="bg-background px-2 py-1 rounded">{'{{customer_name}}'}</code>
              <span className="text-muted-foreground">Customer's full name</span>
              <code className="bg-background px-2 py-1 rounded">{'{{order_id}}'}</code>
              <span className="text-muted-foreground">Order ID (first 8 chars)</span>
              <code className="bg-background px-2 py-1 rounded">{'{{total}}'}</code>
              <span className="text-muted-foreground">Order total amount</span>
              <code className="bg-background px-2 py-1 rounded">{'{{product_name}}'}</code>
              <span className="text-muted-foreground">Product name (for stock alerts)</span>
              <code className="bg-background px-2 py-1 rounded">{'{{quantity}}'}</code>
              <span className="text-muted-foreground">Quantity (for stock alerts)</span>
              <code className="bg-background px-2 py-1 rounded">{'{{balance}}'}</code>
              <span className="text-muted-foreground">Balance amount</span>
              <code className="bg-background px-2 py-1 rounded">{'{{due_date}}'}</code>
              <span className="text-muted-foreground">Payment due date</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
