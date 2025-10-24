import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Announcement {
  id: string;
  title: string;
  message: string;
  category: 'price' | 'fleet' | 'general';
  priority: 'urgent' | 'important' | 'info';
}

export const AnnouncementBar = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    fetchActiveAnnouncements();

    // Subscribe to new announcements
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchActiveAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchActiveAnnouncements = async () => {
    if (!user) return;

    try {
      // Fetch active announcements
      const { data: activeAnnouncements, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      // Fetch user's dismissed announcements
      const { data: dismissed, error: dismissedError } = await supabase
        .from('user_dismissed_announcements')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (dismissedError) throw dismissedError;

      const dismissedIds = new Set(dismissed?.map(d => d.announcement_id) || []);
      
      // Filter out dismissed announcements
      const visibleAnnouncements = activeAnnouncements?.filter(
        a => !dismissedIds.has(a.id)
      ) || [];

      setAnnouncements(visibleAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = async (announcementId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_dismissed_announcements')
        .insert({
          user_id: user.id,
          announcement_id: announcementId
        });

      if (error) throw error;

      // Remove from local state
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-destructive bg-destructive/10 text-destructive';
      case 'important':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'info':
      default:
        return 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-5 w-5" />;
      case 'important':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const badges = {
      price: '💰 Price Update',
      fleet: '🚗 Fleet News',
      general: '📢 Announcement'
    };
    return badges[category as keyof typeof badges] || badges.general;
  };

  if (loading || announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      {announcements.map((announcement) => (
        <Alert
          key={announcement.id}
          className={`${getPriorityStyles(announcement.priority)} relative pr-12 animate-in slide-in-from-top-4`}
        >
          <div className="flex items-start gap-3">
            {getPriorityIcon(announcement.priority)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertTitle className="text-sm font-semibold">
                  {announcement.title}
                </AlertTitle>
                <span className="text-xs opacity-75">
                  {getCategoryBadge(announcement.category)}
                </span>
              </div>
              <AlertDescription className="text-sm">
                {announcement.message}
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => dismissAnnouncement(announcement.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
};
