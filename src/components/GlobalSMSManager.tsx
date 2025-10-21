import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Send, Users, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const GlobalSMSManager = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState<'all_customers' | 'staff'>('all_customers');
  const [loading, setLoading] = useState(false);

  const handleSendSMS = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (message.length > 160) {
      toast.warning('Message is longer than 160 characters and may be split into multiple SMS');
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-sms', {
        body: {
          message: message.trim(),
          targetGroup
        }
      });

      if (error) throw error;

      toast.success(
        `SMS sent successfully to ${data.sentCount} recipient${data.sentCount !== 1 ? 's' : ''}${
          data.failedCount > 0 ? ` (${data.failedCount} failed)` : ''
        }`
      );
      setMessage('');
      setOpen(false); // Close dialog after successful send
    } catch (error: any) {
      console.error('Error sending bulk SMS:', error);
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setLoading(false);
    }
  };

  const characterCount = message.length;
  const smsCount = Math.ceil(characterCount / 160) || 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <MessageSquare className="w-5 h-5" />
          Send Global SMS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send Global SMS
          </DialogTitle>
          <DialogDescription>
            Send SMS notifications to all customers or staff members
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
        <div className="space-y-3">
          <Label>Target Group</Label>
          <RadioGroup value={targetGroup} onValueChange={(value: any) => setTargetGroup(value)}>
            <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
              <RadioGroupItem value="all_customers" id="all_customers" />
              <Label htmlFor="all_customers" className="flex items-center gap-2 cursor-pointer flex-1">
                <Users className="w-4 h-4" />
                <div>
                  <div className="font-medium">All Customers</div>
                  <div className="text-xs text-muted-foreground">
                    Send to all registered customer phone numbers
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
              <RadioGroupItem value="staff" id="staff" />
              <Label htmlFor="staff" className="flex items-center gap-2 cursor-pointer flex-1">
                <Briefcase className="w-4 h-4" />
                <div>
                  <div className="font-medium">All Staff</div>
                  <div className="text-xs text-muted-foreground">
                    Send to workers, managers, and admins
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Enter your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={500}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{characterCount} / 500 characters</span>
            <span>≈ {smsCount} SMS</span>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendSMS} 
            disabled={loading || !message.trim()} 
            className="flex-1 gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send SMS'}
          </Button>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
};
