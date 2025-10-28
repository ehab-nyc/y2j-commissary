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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertCircle, CheckCircle, Clock, X, Trash2, Edit, AlertTriangle, Info, XOctagon, ShoppingCart, ArrowLeft } from 'lucide-react';
import { violationSchema } from '@/lib/validation';
import { ViolationsTable } from '@/components/violations/ViolationsTable';

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
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedCart, setSelectedCart] = useState<{ cartKey: string; severity: string; data: any } | null>(null);
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

    const channel = supabase
      .channel('violations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'violations' },
        () => fetchViolations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'violation_images' },
        () => fetchViolations()
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
      
      const violationsWithSignedUrls = await Promise.all(
        (data || []).map(async (violation) => {
          if (!violation.images || violation.images.length === 0) return violation;

          const imagesWithSignedUrls = await Promise.all(
            violation.images.map(async (image: any) => {
              try {
                const path = image.image_url.replace('violation-images/', '');
                if (!path || path === image.image_url) return image;
                
                const { data: signedUrlData, error } = await supabase.storage
                  .from('violation-images')
                  .createSignedUrl(path, 3600);
                
                if (error || !signedUrlData?.signedUrl) return image;
                
                return { ...image, image_url: signedUrlData.signedUrl };
              } catch (err) {
                return image;
              }
            })
          );
          
          return { ...violation, images: imagesWithSignedUrls };
        })
      );
      
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
      const { data, error } = await supabase.rpc('get_customer_profiles');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error fetching customers', description: error.message });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      const validationResult = violationSchema.safeParse({
        customer_id: formData.customer_id,
        violation_type: formData.violation_type,
        severity: formData.severity,
        description: formData.description,
        cart_name: selectedCustomer?.cart_name || undefined,
        cart_number: selectedCustomer?.cart_number || undefined,
      });

      if (!validationResult.success) {
        toast({ variant: 'destructive', title: 'Validation Error', description: validationResult.error.errors[0].message });
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

      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const fileName = `${violation.id}/${Date.now()}_${image.name}`;
          const { error: uploadError } = await supabase.storage.from('violation-images').upload(fileName, image);
          if (uploadError) throw uploadError;
          await supabase.from('violation_images').insert({
            violation_id: violation.id,
            image_url: `violation-images/${fileName}`,
          });
        }
      }

      toast({ title: 'Violation reported', description: 'The violation has been successfully recorded.' });
      setOpen(false);
      resetForm();
      fetchViolations();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error creating violation', description: error.message });
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (status === 'resolved') updateData.resolved_at = new Date().toISOString();
      if (notes) updateData.resolution_notes = notes;

      const { error } = await supabase.from('violations').update(updateData).eq('id', id);
      if (error) throw error;

      toast({ title: 'Status updated', description: 'The violation status has been updated.' });
      fetchViolations();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating status', description: error.message });
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
      const validationResult = violationSchema.safeParse({
        customer_id: formData.customer_id,
        violation_type: formData.violation_type,
        severity: formData.severity,
        description: formData.description,
        cart_name: selectedCustomer?.cart_name || undefined,
        cart_number: selectedCustomer?.cart_number || undefined,
      });

      if (!validationResult.success) {
        toast({ variant: 'destructive', title: 'Validation Error', description: validationResult.error.errors[0].message });
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

      toast({ title: 'Violation updated', description: 'The violation has been successfully updated.' });
      setOpen(false);
      setEditingViolation(null);
      resetForm();
      fetchViolations();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating violation', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('violation_images').delete().eq('violation_id', id);
      const { error } = await supabase.from('violations').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Violation deleted', description: 'The violation has been successfully deleted.' });
      fetchViolations();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error deleting violation', description: error.message });
    }
  };

  const resetForm = () => {
    setEditingViolation(null);
    setFormData({ customer_id: '', violation_type: '', description: '', severity: 'medium' });
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

  const violationsData = useMemo(() => {
    const active = violations.filter(v => v.status === 'pending' || v.status === 'in_review');
    const history = violations.filter(v => v.status === 'resolved' || v.status === 'dismissed');
    
    const bySeverity = {
      critical: active.filter(v => v.severity === 'critical'),
      high: active.filter(v => v.severity === 'high'),
      medium: active.filter(v => v.severity === 'medium'),
      low: active.filter(v => v.severity === 'low'),
    };

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

    const totalActive = active.length;
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
      bySeverity,
      severityGroups,
      metrics: {
        totalActive,
        criticalCount: bySeverity.critical.length,
        highCount: bySeverity.high.length,
        mediumCount: bySeverity.medium.length,
        lowCount: bySeverity.low.length,
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
      <div className="flex justify-between items-center mb-4">
        <div>
          <BackButton />
          <h1 className="text-2xl font-bold">Violations</h1>
        </div>
        {(hasRole('worker') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Report Violation</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingViolation ? 'Edit Violation' : 'Report Violation'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={editingViolation ? handleUpdate : handleSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customer_id" className="text-right">
                    Customer
                  </Label>
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })} >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.full_name || customer.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="violation_type" className="text-right">
                    Type
                  </Label>
                  <Input id="violation_type" value={formData.violation_type} className="col-span-3" onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="severity" className="text-right">
                    Severity
                  </Label>
                  <Select value={formData.severity} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setFormData({ ...formData, severity: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right mt-2">
                    Description
                  </Label>
                  <Textarea id="description" value={formData.description} className="col-span-3" onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="images" className="text-right">
                    Images
                  </Label>
                  <Input type="file" id="images" multiple className="col-span-3" onChange={handleImageChange} />
                </div>
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Selected</Label>
                    <div className="col-span-3 flex gap-2">
                      {Array.from(selectedImages).map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={image.name}
                            className="h-16 w-16 rounded object-cover"
                          />
                          <Button variant="ghost" size="icon" className="absolute top-0 right-0" onClick={() => {
                            setSelectedImages(prev => {
                              const newArray = [...prev];
                              newArray.splice(index, 1);
                              return newArray;
                            });
                          }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button type="submit">{editingViolation ? 'Update Violation' : 'Report Violation'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedCart ? (
        // Level 3: Show violations table for selected cart
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCart(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>
                  {selectedCart.data.cart_name} ({selectedCart.data.cart_number})
                </CardTitle>
                <CardDescription>
                  {selectedCart.data.violations.length} violation(s) - Severity: {selectedCart.severity}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ViolationsTable
              violations={selectedCart.data.violations}
              hasRole={hasRole}
              updateStatus={updateStatus}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              setFullScreenImage={setFullScreenImage}
              getStatusIcon={getStatusIcon}
              getSeverityColor={getSeverityColor}
            />
          </CardContent>
        </Card>
      ) : selectedSeverity ? (
        // Level 2: Show carts for selected severity
        <>
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedSeverity(null)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Severities
            </Button>
            <h2 className="text-2xl font-bold capitalize">{selectedSeverity} Severity Violations</h2>
            <p className="text-muted-foreground">
              {Object.keys(violationsData.severityGroups[selectedSeverity as keyof typeof violationsData.severityGroups] || {}).length} cart(s) with violations
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(violationsData.severityGroups[selectedSeverity as keyof typeof violationsData.severityGroups] || {}).map(([cartKey, cartData]: [string, any]) => (
              <Card 
                key={cartKey}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => setSelectedCart({ cartKey, severity: selectedSeverity, data: cartData })}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <ShoppingCart className="h-6 w-6 mt-1" />
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {cartData.cart_name}
                      </CardTitle>
                      <CardDescription>
                        Cart #{cartData.cart_number}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Violations</span>
                      <Badge variant={getSeverityColor(selectedSeverity)}>
                        {cartData.violations.length}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Customer:</p>
                      <p>{cartData.customer.full_name || cartData.customer.email}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Recent Violations:</p>
                      {cartData.violations.slice(0, 3).map((v: any) => (
                        <div key={v.id} className="text-xs text-muted-foreground truncate">
                          • {v.violation_type}
                        </div>
                      ))}
                      {cartData.violations.length > 3 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          +{cartData.violations.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        // Level 1: Show severity cards
        <>
          <div className="grid gap-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Violations</CardTitle>
                  <CardDescription>Total number of active violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{violationsData.metrics.totalActive}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Critical</CardTitle>
                  <CardDescription>Number of critical violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{violationsData.metrics.criticalCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>High</CardTitle>
                  <CardDescription>Number of high violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{violationsData.metrics.highCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Medium</CardTitle>
                  <CardDescription>Number of medium violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{violationsData.metrics.mediumCount}</div>
                </CardContent>
              </Card>
            </div>

            {violationsData.metrics.topCarts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Carts with Violations</CardTitle>
                  <CardDescription>Carts with the most active violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-none pl-0">
                    {violationsData.metrics.topCarts.map((item) => (
                      <li key={item.cart} className="py-2 border-b last:border-b-0">
                        <div className="flex justify-between items-center">
                          <span>{item.cart}</span>
                          <Badge variant="secondary">{item.count} Violations</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <h2 className="text-xl font-bold mb-4">Active Violations by Severity</h2>
          <p className="text-muted-foreground mb-6">Click on a severity level to view affected carts</p>
          
          {violationsData.active.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No active violations</AlertTitle>
              <AlertDescription>There are no pending or in review violations at the moment.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
                const cartCount = Object.keys(violationsData.severityGroups[severity] || {}).length;
                const violationCount = violationsData.bySeverity[severity].length;
                
                if (cartCount === 0) return null;

                return (
                  <Card
                    key={severity}
                    className="cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                    onClick={() => setSelectedSeverity(severity)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(severity)}
                        <CardTitle className="capitalize text-xl">{severity}</CardTitle>
                      </div>
                      <CardDescription>Click to view affected carts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold">{violationCount}</div>
                          <div className="text-sm text-muted-foreground">violations</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          across <span className="font-semibold">{cartCount}</span> cart(s)
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <h2 className="text-xl font-bold mt-8 mb-4">Violation History</h2>
          {violationsData.history.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No violation history</AlertTitle>
              <AlertDescription>There are no resolved or dismissed violations.</AlertDescription>
            </Alert>
          ) : (
            <ViolationsTable
              violations={violationsData.history}
              hasRole={hasRole}
              updateStatus={updateStatus}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              setFullScreenImage={setFullScreenImage}
              getStatusIcon={getStatusIcon}
              getSeverityColor={getSeverityColor}
            />
          )}
        </>
      )}

      {fullScreenImage && (
        <div className="fixed top-0 left-0 h-full w-full bg-black bg-opacity-80 z-50 flex items-center justify-center" onClick={() => setFullScreenImage(null)}>
          <img src={fullScreenImage} alt="Full Screen Violation" className="max-h-96 max-w-full object-contain" />
          <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setFullScreenImage(null)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
