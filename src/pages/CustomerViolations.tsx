import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Violation {
  id: string;
  violation_type: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  cart_number: string | null;
  cart_name: string | null;
  images: { id: string; image_url: string }[];
}

const CustomerViolations = () => {
  const { user } = useAuth();
  const [violations, setViolations] = useState<Violation[]>([]);

  useEffect(() => {
    fetchViolations();
  }, [user]);

  const fetchViolations = async () => {
    if (!user) return;

    // Get user's cart number for explicit filtering
    const { data: profile } = await supabase
      .from('profiles')
      .select('cart_number')
      .eq('id', user.id)
      .single();

    // Explicit filtering for defense-in-depth security
    const { data, error } = await supabase
      .from('violations')
      .select(`
        *,
        images:violation_images(id, image_url)
      `)
      .or(`customer_id.eq.${user.id},cart_number.eq.${profile?.cart_number}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Generate signed URLs for violation images
      const violationsWithSignedUrls = await Promise.all(
        (data || []).map(async (violation) => {
          const imagesWithSignedUrls = await Promise.all(
            (violation.images || []).map(async (image: any) => {
              // Extract path from stored format: "violation-images/path/file.jpg"
              const path = image.image_url.replace('violation-images/', '');
              
              if (path) {
                const { data: signedUrl, error: urlError } = await supabase.storage
                  .from('violation-images')
                  .createSignedUrl(path, 3600); // 1 hour expiration
                
                if (urlError) {
                  console.error('Error generating signed URL:', urlError);
                  return image;
                }
                
                return {
                  ...image,
                  image_url: signedUrl?.signedUrl || image.image_url
                };
              }
              return image;
            })
          );
          
          return {
            ...violation,
            images: imagesWithSignedUrls
          };
        })
      );
      
      setViolations(violationsWithSignedUrls as Violation[]);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'high':
        return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'critical':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getViolationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'under_review':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'resolved':
        return 'bg-green-500/10 text-green-700 border-green-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Violation History</h1>
          <p className="text-muted-foreground">View violations associated with your cart</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              My Violations
            </CardTitle>
            <CardDescription>All violations related to your cart number</CardDescription>
          </CardHeader>
          <CardContent>
            {violations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No violations found</p>
            ) : (
              <div className="space-y-4">
                {violations.map(violation => (
                  <div key={violation.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <div>
                          <p className="font-semibold">{violation.violation_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(violation.created_at), 'PPp')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(violation.severity)}>
                            {violation.severity.toUpperCase()}
                          </Badge>
                          <Badge className={getViolationStatusColor(violation.status)}>
                            {violation.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      {violation.cart_number && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Cart: {violation.cart_name || violation.cart_number}
                        </p>
                      )}
                      <p className="text-sm">{violation.description}</p>
                      
                      {violation.images && violation.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                          {violation.images.map((image) => (
                            <img
                              key={image.id}
                              src={image.image_url}
                              alt="Violation"
                              className="rounded-lg object-cover w-full h-32"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerViolations;
