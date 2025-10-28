import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertCircle, CheckCircle, Clock, X, Trash2, Edit, AlertTriangle, Info, XOctagon, TrendingUp, ShoppingCart } from 'lucide-react';
import { violationSchema } from '@/lib/validation';
import { TranslateButton } from '@/components/TranslateButton';

interface Customer {
  id: string;
  full_name: string | null;
  email: string;
  cart_name: string | null;
  cart_number: string | null;
}

interface Violation {
  id: string;
  customer_id: string;
  inspector_id: string;
  cart_name: string | null;
  cart_number: string | null;
  violation_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  customer: Customer;
  inspector: {
    id: string;
    full_name: string | null;
    email: string;
  };
  images: { id: string; image_url: string }[];
}

export default function Violations() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    customer_id: string;
    violation_type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>({
    customer_id: '',
    violation_type: '',
    description: '',
    severity: 'medium',
  });

  useEffect(() => {
    fetchViolations();
    fetchCustomers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('violations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'violations'
        },
        () => {
          fetchViolations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'violation_images'
        },
        () => {
          fetchViolations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchViolations = async () => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select(`
          *,
          customer:profiles!violations_customer_id_fkey(id, full_name, email, cart_name, cart_number),
          inspector:profiles!violations_inspector_id_fkey(id, full_name, email),
          images:violation_images(id, image_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get signed URLs for all violation images
      const violationsWithSignedUrls = await Promise.all(
        (data || []).map(async (violation) => {
          if (!violation.images || violation.images.length === 0) {
            return violation;
          }

          const imagesWithSignedUrls = await Promise.all(
            violation.images.map(async (image: any) => {
              try {
                // Extract path from stored format: "violation-images/path/file.jpg"
                const path = image.image_url.replace('violation-images/', '');
                
                console.log('Generating signed URL for path:', path);
                
                if (!path || path === image.image_url) {
                  console.error('Invalid image path format:', image.image_url);
                  return image;
                }
                
                const { data: signedUrlData, error } = await supabase.storage
                  .from('violation-images')
                  .createSignedUrl(path, 3600); // 1 hour expiration
                
                if (error) {
                  console.error('Error generating signed URL for path', path, ':', error);
                  return image;
                }
                
                if (!signedUrlData?.signedUrl) {
                  console.error('No signed URL returned for path:', path);
                  return image;
                }
                
                console.log('Successfully generated signed URL for:', path);
                
                return {
                  ...image,
                  image_url: signedUrlData.signedUrl
                };
              } catch (err) {
                console.error('Exception generating signed URL:', err);
                return image;
              }
            })
          );
          
          return {
            ...violation,
            images: imagesWithSignedUrls
          };
        })
      );
      
      console.log('Violations with signed URLs:', violationsWithSignedUrls);
      setViolations(violationsWithSignedUrls as Violation[] || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching violations',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_customer_profiles');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching customers',
        description: error.message,
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      
      // Validate input data
      const validationResult = violationSchema.safeParse({
        customer_id: formData.customer_id,
        violation_type: formData.violation_type,
        severity: formData.severity,
        description: formData.description,
        cart_name: selectedCustomer?.cart_name || undefined,
        cart_number: selectedCustomer?.cart_number || undefined,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: firstError.message,
        });
        return;
      }
      
      const { data: violation, error: violationError } = await supabase
        .from('violations')
        .insert({
          customer_id: formData.customer_id,
          inspector_id: user.id,
          cart_name: selectedCustomer?.cart_name,
          cart_number: selectedCustomer?.cart_number,
          violation_type: formData.violation_type,
          description: formData.description,
          severity: formData.severity,
        })
        .select()
        .single();

      if (violationError) throw violationError;

      // Upload images
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const fileName = `${violation.id}/${Date.now()}_${image.name}`;
          const { error: uploadError } = await supabase.storage
            .from('violation-images')
            .upload(fileName, image);

          if (uploadError) throw uploadError;

          // Store the path in the database, not the public URL
          await supabase.from('violation_images').insert({
            violation_id: violation.id,
            image_url: `violation-images/${fileName}`,
          });
        }
      }

      toast({
        title: 'Violation reported',
        description: 'The violation has been successfully recorded.',
      });

      setOpen(false);
      setFormData({
        customer_id: '',
        violation_type: '',
        description: '',
        severity: 'medium',
      });
      setSelectedImages([]);
      fetchViolations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating violation',
        description: error.message,
      });
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      if (notes) {
        updateData.resolution_notes = notes;
      }

      const { error } = await supabase
        .from('violations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: 'The violation status has been updated.',
      });
      fetchViolations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating status',
        description: error.message,
      });
    }
  };

  const handleEdit = (violation: Violation) => {
    setEditingViolation(violation);
    setFormData({
      customer_id: violation.customer_id,
      violation_type: violation.violation_type,
      description: violation.description,
      severity: violation.severity,
    });
    setOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingViolation) return;

    try {
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      
      // Validate input data
      const validationResult = violationSchema.safeParse({
        customer_id: formData.customer_id,
        violation_type: formData.violation_type,
        severity: formData.severity,
        description: formData.description,
        cart_name: selectedCustomer?.cart_name || undefined,
        cart_number: selectedCustomer?.cart_number || undefined,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: firstError.message,
        });
        return;
      }
      
      const { error } = await supabase
        .from('violations')
        .update({
          customer_id: formData.customer_id,
          cart_name: selectedCustomer?.cart_name,
          cart_number: selectedCustomer?.cart_number,
          violation_type: formData.violation_type,
          description: formData.description,
          severity: formData.severity,
        })
        .eq('id', editingViolation.id);

      if (error) throw error;

      toast({
        title: 'Violation updated',
        description: 'The violation has been successfully updated.',
      });

      setOpen(false);
      setEditingViolation(null);
      setFormData({
        customer_id: '',
        violation_type: '',
        description: '',
        severity: 'medium',
      });
      fetchViolations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating violation',
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // First delete associated images
      const { error: imagesError } = await supabase
        .from('violation_images')
        .delete()
        .eq('violation_id', id);

      if (imagesError) throw imagesError;

      // Then delete the violation
      const { error } = await supabase
        .from('violations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Violation deleted',
        description: 'The violation has been successfully deleted.',
      });
      fetchViolations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting violation',
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setEditingViolation(null);
    setFormData({
      customer_id: '',
      violation_type: '',
      description: '',
      severity: 'medium',
    });
    setSelectedImages([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XOctagon className="h-5 w-5" />;
      case 'high': return <AlertTriangle className="h-5 w-5" />;
      case 'medium': return <AlertCircle className="h-5 w-5" />;
      case 'low': return <Info className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'dismissed': return <X className="h-4 w-4" />;
      case 'in_review': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Organize violations data
  const violationsData = useMemo(() => {
    const active = violations.filter(v => v.status === 'pending' || v.status === 'in_review');
    const history = violations.filter(v => v.status === 'resolved' || v.status === 'dismissed');
    
    // Group active violations by severity
    const bySeverity = {
      critical: active.filter(v => v.severity === 'critical'),
      high: active.filter(v => v.severity === 'high'),
      medium: active.filter(v => v.severity === 'medium'),
      low: active.filter(v => v.severity === 'low'),
    };

    // Group by cart within each severity
    const groupByCart = (violations: Violation[]) => {
      return violations.reduce((acc, v) => {
        const cartKey = v.cart_number || v.customer.cart_number || 'Unknown';
        if (!acc[cartKey]) {
          acc[cartKey] = {
            cart_name: v.cart_name || v.customer.cart_name || 'Unknown Cart',
            cart_number: cartKey,
            customer: v.customer,
            violations: []
          };
        }
        acc[cartKey].violations.push(v);
        return acc;
      }, {} as Record<string, { cart_name: string; cart_number: string; customer: Customer; violations: Violation[] }>);
    };

    const severityGroups = {
      critical: groupByCart(bySeverity.critical),
      high: groupByCart(bySeverity.high),
      medium: groupByCart(bySeverity.medium),
      low: groupByCart(bySeverity.low),
    };

    // Calculate metrics
    const totalActive = active.length;
    const criticalCount = bySeverity.critical.length;
    const highCount = bySeverity.high.length;
    const mediumCount = bySeverity.medium.length;
    const lowCount = bySeverity.low.length;

    // Find most problematic carts
    const cartViolationCounts = active.reduce((acc, v) => {
      const cartKey = v.cart_number || v.customer.cart_number || 'Unknown';
      acc[cartKey] = (acc[cartKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCarts = Object.entries(cartViolationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cart, count]) => ({ cart, count }));

    return {
      active,
      history,
      severityGroups,
      metrics: {
        totalActive,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        topCarts
      }
    };
  }, [violations]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Cart Violations Management</h1>
            <p className="text-muted-foreground mt-1">Monitor and resolve cart violations efficiently</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>Report Violation</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingViolation ? 'Edit Violation' : 'Report Cart Violation'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={editingViolation ? handleUpdate : handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customer">Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.full_name || customer.email} 
                          {customer.cart_name && ` - Cart: ${customer.cart_name} ${customer.cart_number || ''}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="violation_type">Violation Type</Label>
                  <Input
                    id="violation_type"
                    value={formData.violation_type}
                    onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
                    placeholder="e.g., Damaged cart, Missing items, Cleanliness issue"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the violation in detail..."
                    rows={4}
                    required
                  />
                </div>

                {!editingViolation && (
                  <div>
                    <Label htmlFor="images">Images (optional)</Label>
                    <Input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                    />
                    {selectedImages.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedImages.length} image(s) selected
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  {editingViolation ? 'Update Violation' : 'Submit Report'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Metrics */}
        {violationsData.metrics.totalActive > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <Card className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{violationsData.metrics.totalActive}</div>
                <p className="text-xs text-muted-foreground mt-1">Pending & In Review</p>
              </CardContent>
            </Card>

            <Card className="hover-scale border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-destructive">Critical & High</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {violationsData.metrics.criticalCount + violationsData.metrics.highCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {violationsData.metrics.criticalCount} Critical, {violationsData.metrics.highCount} High
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Medium & Low</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {violationsData.metrics.mediumCount + violationsData.metrics.lowCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {violationsData.metrics.mediumCount} Medium, {violationsData.metrics.lowCount} Low
                </p>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Problem Carts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {violationsData.metrics.topCarts.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.cart}</span>
                      <Badge variant="destructive" className="text-xs">{item.count}</Badge>
                    </div>
                  ))}
                  {violationsData.metrics.topCarts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Violations Card */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Active Violations
            </CardTitle>
            <CardDescription>Violations requiring attention, organized by severity</CardDescription>
          </CardHeader>
          <CardContent>
            {violationsData.metrics.totalActive === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active violations - All clear!</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full space-y-4">
                {/* Critical Severity */}
                {violationsData.metrics.criticalCount > 0 && (
                  <AccordionItem value="critical" className="border-destructive/50 rounded-lg border-2">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 bg-destructive/10 rounded-lg">
                          {getSeverityIcon('critical')}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">Critical Violations</span>
                            <Badge variant="destructive">{violationsData.metrics.criticalCount}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Requires immediate attention</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-4">
                      <div className="space-y-4">
                        {Object.entries(violationsData.severityGroups.critical).map(([cartKey, cartData]) => (
                          <Card key={cartKey} className="border-destructive/30">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <ShoppingCart className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">{cartData.cart_name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      Cart #{cartData.cart_number} • {cartData.customer.full_name || cartData.customer.email}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="destructive">{cartData.violations.length} violations</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {cartData.violations.map((violation) => (
                                <div key={violation.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        {getStatusIcon(violation.status)}
                                        <span className="font-medium">{violation.violation_type}</span>
                                        <Badge variant="outline" className="text-xs">{violation.status}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Reported by {violation.inspector.full_name || violation.inspector.email} • {new Date(violation.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {violation.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {violation.images.map((image) => (
                                        <img
                                          key={image.id}
                                          src={image.image_url}
                                          alt="Violation"
                                          className="rounded-lg object-cover w-full h-24 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => setFullScreenImage(image.image_url)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {violation.resolution_notes && (
                                    <Alert>
                                      <AlertTitle className="text-sm">Resolution Notes</AlertTitle>
                                      <AlertDescription className="text-xs">{violation.resolution_notes}</AlertDescription>
                                    </Alert>
                                  )}

                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {violation.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateStatus(violation.id, 'in_review')}
                                      >
                                        Mark In Review
                                      </Button>
                                    )}
                                    {(violation.status === 'pending' || violation.status === 'in_review') && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => {
                                            const notes = prompt('Enter resolution notes:');
                                            if (notes) updateStatus(violation.id, 'resolved', notes);
                                          }}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Resolve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateStatus(violation.id, 'dismissed')}
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Dismiss
                                        </Button>
                                      </>
                                    )}
                                    {hasRole('super_admin') && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEdit(violation)}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Edit
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                              <Trash2 className="w-4 h-4 mr-1" />
                                              Delete
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Violation?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete this violation and all associated images. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDelete(violation.id)}>
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* High Severity */}
                {violationsData.metrics.highCount > 0 && (
                  <AccordionItem value="high" className="border-orange-500/50 rounded-lg border-2">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          {getSeverityIcon('high')}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">High Priority Violations</span>
                            <Badge className="bg-orange-500">{violationsData.metrics.highCount}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Should be addressed soon</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-4">
                      <div className="space-y-4">
                        {Object.entries(violationsData.severityGroups.high).map(([cartKey, cartData]) => (
                          <Card key={cartKey} className="border-orange-500/30">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <ShoppingCart className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">{cartData.cart_name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      Cart #{cartData.cart_number} • {cartData.customer.full_name || cartData.customer.email}
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-orange-500">{cartData.violations.length} violations</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {cartData.violations.map((violation) => (
                                <div key={violation.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        {getStatusIcon(violation.status)}
                                        <span className="font-medium">{violation.violation_type}</span>
                                        <Badge variant="outline" className="text-xs">{violation.status}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Reported by {violation.inspector.full_name || violation.inspector.email} • {new Date(violation.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {violation.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {violation.images.map((image) => (
                                        <img
                                          key={image.id}
                                          src={image.image_url}
                                          alt="Violation"
                                          className="rounded-lg object-cover w-full h-24 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => setFullScreenImage(image.image_url)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {violation.resolution_notes && (
                                    <Alert>
                                      <AlertTitle className="text-sm">Resolution Notes</AlertTitle>
                                      <AlertDescription className="text-xs">{violation.resolution_notes}</AlertDescription>
                                    </Alert>
                                  )}

                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {violation.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateStatus(violation.id, 'in_review')}
                                      >
                                        Mark In Review
                                      </Button>
                                    )}
                                    {(violation.status === 'pending' || violation.status === 'in_review') && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => {
                                            const notes = prompt('Enter resolution notes:');
                                            if (notes) updateStatus(violation.id, 'resolved', notes);
                                          }}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Resolve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateStatus(violation.id, 'dismissed')}
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Dismiss
                                        </Button>
                                      </>
                                    )}
                                    {hasRole('super_admin') && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEdit(violation)}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Edit
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                              <Trash2 className="w-4 h-4 mr-1" />
                                              Delete
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Violation?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete this violation and all associated images. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDelete(violation.id)}>
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Medium Severity */}
                {violationsData.metrics.mediumCount > 0 && (
                  <AccordionItem value="medium" className="border-yellow-500/50 rounded-lg border">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                          {getSeverityIcon('medium')}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">Medium Priority Violations</span>
                            <Badge className="bg-yellow-500">{violationsData.metrics.mediumCount}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Monitor and resolve when possible</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-4">
                      <div className="space-y-4">
                        {Object.entries(violationsData.severityGroups.medium).map(([cartKey, cartData]) => (
                          <Card key={cartKey} className="border-yellow-500/30">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <ShoppingCart className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">{cartData.cart_name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      Cart #{cartData.cart_number} • {cartData.customer.full_name || cartData.customer.email}
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-yellow-500">{cartData.violations.length} violations</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {cartData.violations.map((violation) => (
                                <div key={violation.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        {getStatusIcon(violation.status)}
                                        <span className="font-medium">{violation.violation_type}</span>
                                        <Badge variant="outline" className="text-xs">{violation.status}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Reported by {violation.inspector.full_name || violation.inspector.email} • {new Date(violation.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {violation.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {violation.images.map((image) => (
                                        <img
                                          key={image.id}
                                          src={image.image_url}
                                          alt="Violation"
                                          className="rounded-lg object-cover w-full h-24 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => setFullScreenImage(image.image_url)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {violation.resolution_notes && (
                                    <Alert>
                                      <AlertTitle className="text-sm">Resolution Notes</AlertTitle>
                                      <AlertDescription className="text-xs">{violation.resolution_notes}</AlertDescription>
                                    </Alert>
                                  )}

                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {violation.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateStatus(violation.id, 'in_review')}
                                      >
                                        Mark In Review
                                      </Button>
                                    )}
                                    {(violation.status === 'pending' || violation.status === 'in_review') && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => {
                                            const notes = prompt('Enter resolution notes:');
                                            if (notes) updateStatus(violation.id, 'resolved', notes);
                                          }}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Resolve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateStatus(violation.id, 'dismissed')}
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Dismiss
                                        </Button>
                                      </>
                                    )}
                                    {hasRole('super_admin') && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEdit(violation)}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Edit
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                              <Trash2 className="w-4 h-4 mr-1" />
                                              Delete
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Violation?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete this violation and all associated images. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDelete(violation.id)}>
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Low Severity */}
                {violationsData.metrics.lowCount > 0 && (
                  <AccordionItem value="low" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          {getSeverityIcon('low')}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">Low Priority Violations</span>
                            <Badge variant="secondary">{violationsData.metrics.lowCount}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Minor issues for tracking</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-4">
                      <div className="space-y-4">
                        {Object.entries(violationsData.severityGroups.low).map(([cartKey, cartData]) => (
                          <Card key={cartKey}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <ShoppingCart className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">{cartData.cart_name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      Cart #{cartData.cart_number} • {cartData.customer.full_name || cartData.customer.email}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="secondary">{cartData.violations.length} violations</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {cartData.violations.map((violation) => (
                                <div key={violation.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        {getStatusIcon(violation.status)}
                                        <span className="font-medium">{violation.violation_type}</span>
                                        <Badge variant="outline" className="text-xs">{violation.status}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Reported by {violation.inspector.full_name || violation.inspector.email} • {new Date(violation.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {violation.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {violation.images.map((image) => (
                                        <img
                                          key={image.id}
                                          src={image.image_url}
                                          alt="Violation"
                                          className="rounded-lg object-cover w-full h-24 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => setFullScreenImage(image.image_url)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {violation.resolution_notes && (
                                    <Alert>
                                      <AlertTitle className="text-sm">Resolution Notes</AlertTitle>
                                      <AlertDescription className="text-xs">{violation.resolution_notes}</AlertDescription>
                                    </Alert>
                                  )}

                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {violation.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateStatus(violation.id, 'in_review')}
                                      >
                                        Mark In Review
                                      </Button>
                                    )}
                                    {(violation.status === 'pending' || violation.status === 'in_review') && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => {
                                            const notes = prompt('Enter resolution notes:');
                                            if (notes) updateStatus(violation.id, 'resolved', notes);
                                          }}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Resolve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateStatus(violation.id, 'dismissed')}
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Dismiss
                                        </Button>
                                      </>
                                    )}
                                    {hasRole('super_admin') && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEdit(violation)}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Edit
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                              <Trash2 className="w-4 h-4 mr-1" />
                                              Delete
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Violation?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete this violation and all associated images. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDelete(violation.id)}>
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Violations History Card */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Violations History
            </CardTitle>
            <CardDescription>Resolved and dismissed violations</CardDescription>
          </CardHeader>
          <CardContent>
            {violationsData.history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Info className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {violationsData.history.map((violation) => (
                  <Card key={violation.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(violation.status)}
                            <span className="font-medium">{violation.violation_type}</span>
                            <Badge variant={getSeverityColor(violation.severity)}>{violation.severity}</Badge>
                            <Badge variant="outline">{violation.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Cart: {violation.cart_name || 'Unknown'} #{violation.cart_number || 'N/A'} • {violation.customer.full_name || violation.customer.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Reported: {new Date(violation.created_at).toLocaleString()}
                            {violation.resolved_at && ` • Resolved: ${new Date(violation.resolved_at).toLocaleString()}`}
                          </p>
                        </div>
                      </div>

                      {violation.resolution_notes && (
                        <Alert>
                          <AlertTitle className="text-sm">Resolution Notes</AlertTitle>
                          <AlertDescription className="text-xs">{violation.resolution_notes}</AlertDescription>
                        </Alert>
                      )}

                      {violation.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {violation.images.map((image) => (
                            <img
                              key={image.id}
                              src={image.image_url}
                              alt="Violation"
                              className="rounded-lg object-cover w-full h-24 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setFullScreenImage(image.image_url)}
                            />
                          ))}
                        </div>
                      )}

                      {hasRole('super_admin') && (
                        <div className="flex gap-2 pt-2 border-t">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Violation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this violation and all associated images. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(violation.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!fullScreenImage} onOpenChange={() => setFullScreenImage(null)}>
        <DialogContent className="max-w-7xl w-full p-0 bg-black/95">
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-50 bg-background text-foreground p-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {fullScreenImage && (
            <img
              src={fullScreenImage}
              alt="Violation full screen"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
