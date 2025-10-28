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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertCircle, CheckCircle, Clock, X, Trash2, Edit, AlertTriangle, Info, XOctagon, ShoppingCart, ArrowLeft, Download, Mail, MessageSquare, Search, CalendarIcon, Filter } from 'lucide-react';
import { violationSchema } from '@/lib/validation';
import { ViolationsTable } from '@/components/violations/ViolationsTable';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  full_name: string | null;
  email: string;
  cart_name: string | null;
  cart_number: string | null;
}

interface Violation {
  id: string;
  customer_id: string | null;
  manual_customer_name: string | null;
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
  const [carts, setCarts] = useState<{ cart_name: string; cart_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedCart, setSelectedCart] = useState<{ cartKey: string; severity: string; data: any } | null>(null);
  const [selectedHistorySeverity, setSelectedHistorySeverity] = useState<string | null>(null);
  const [selectedHistoryCart, setSelectedHistoryCart] = useState<{ cartKey: string; severity: string; data: any } | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [cartOwners, setCartOwners] = useState<Record<string, { full_name: string | null }>>({});
  const [formData, setFormData] = useState<{
    customer_id: string;
    manual_customer_name: string;
    cart_name: string;
    cart_number: string;
    violation_type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>({
    customer_id: '',
    manual_customer_name: '',
    cart_name: '',
    cart_number: '',
    violation_type: '',
    description: '',
    severity: 'medium',
  });

  useEffect(() => {
    fetchViolations();
    fetchCustomers();
    fetchCarts();
    fetchCartOwners();

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

  const fetchCartOwners = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_ownership')
        .select('customer_id, owner:profiles!cart_ownership_owner_id_fkey(full_name)');
      
      if (error) throw error;
      
      const ownerMap: Record<string, { full_name: string | null }> = {};
      data?.forEach((item: any) => {
        if (item.customer_id && item.owner) {
          ownerMap[item.customer_id] = item.owner;
        }
      });
      
      setCartOwners(ownerMap);
    } catch (error: any) {
      console.error('Error fetching cart owners:', error);
    }
  };

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
                // Handle both formats: with or without 'violation-images/' prefix
                let path = image.image_url;
                if (path.startsWith('violation-images/')) {
                  path = path.replace('violation-images/', '');
                }
                
                const { data: signedUrlData, error } = await supabase.storage
                  .from('violation-images')
                  .createSignedUrl(path, 3600);
                
                if (error) {
                  console.error('Error creating signed URL:', error);
                  return image;
                }
                
                if (!signedUrlData?.signedUrl) return image;
                
                return { ...image, image_url: signedUrlData.signedUrl };
              } catch (err) {
                console.error('Error processing image:', err);
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

  const fetchCarts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('cart_name, cart_number')
        .not('cart_name', 'is', null)
        .not('cart_number', 'is', null)
        .order('cart_name');
      
      if (error) throw error;
      
      // Get unique combinations
      const uniqueCarts = Array.from(
        new Map(data?.map(item => [`${item.cart_name}-${item.cart_number}`, item])).values()
      );
      
      setCarts(uniqueCarts || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error fetching carts', description: error.message });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Validate based on entry type
      if (!isManualEntry && !formData.customer_id) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a customer or switch to manual entry' });
        return;
      }
      
      if (isManualEntry && !formData.manual_customer_name) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a customer name' });
        return;
      }

      if (!formData.violation_type || !formData.description) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill in all required fields' });
        return;
      }
      
      const insertData: any = {
        inspector_id: user.id,
        violation_type: formData.violation_type,
        description: formData.description,
        severity: formData.severity,
      };

      if (isManualEntry) {
        insertData.manual_customer_name = formData.manual_customer_name;
        insertData.cart_name = formData.cart_name || null;
        insertData.cart_number = formData.cart_number || null;
      } else {
        insertData.customer_id = formData.customer_id;
        insertData.cart_name = formData.cart_name || null;
        insertData.cart_number = formData.cart_number || null;
      }
      
      const { data: violation, error: violationError } = await supabase
        .from('violations')
        .insert(insertData)
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
    setIsManualEntry(!violation.customer_id);
    setFormData({
      customer_id: violation.customer_id || '',
      manual_customer_name: violation.manual_customer_name || '',
      cart_name: violation.cart_name || '',
      cart_number: violation.cart_number || '',
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
      // Validate based on entry type
      if (!isManualEntry && !formData.customer_id) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a customer or switch to manual entry' });
        return;
      }
      
      if (isManualEntry && !formData.manual_customer_name) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a customer name' });
        return;
      }

      if (!formData.violation_type || !formData.description) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill in all required fields' });
        return;
      }

      const updateData: any = {
        violation_type: formData.violation_type,
        description: formData.description,
        severity: formData.severity,
      };

      if (isManualEntry) {
        updateData.customer_id = null;
        updateData.manual_customer_name = formData.manual_customer_name;
        updateData.cart_name = formData.cart_name || null;
        updateData.cart_number = formData.cart_number || null;
      } else {
        updateData.customer_id = formData.customer_id;
        updateData.manual_customer_name = null;
        updateData.cart_name = formData.cart_name || null;
        updateData.cart_number = formData.cart_number || null;
      }
      
      const { error } = await supabase
        .from('violations')
        .update(updateData)
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

  const handleResolveAll = async (cartViolations: Violation[]) => {
    try {
      const notes = prompt('Enter resolution notes for all violations:');
      if (!notes) return;

      for (const violation of cartViolations) {
        await supabase.from('violations').update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: notes
        }).eq('id', violation.id);
      }

      toast({ title: 'All violations resolved', description: `Resolved ${cartViolations.length} violation(s)` });
      fetchViolations();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error resolving violations', description: error.message });
    }
  };

  const handleContactCustomer = async (customer: Customer | null, manualName: string | null) => {
    if (!customer && !manualName) {
      toast({ variant: 'destructive', title: 'No customer information', description: 'Cannot contact customer' });
      return;
    }

    const customerName = manualName || customer?.full_name || customer?.email || 'Customer';
    
    toast({ 
      title: 'Contact Options', 
      description: `You can contact ${customerName} via SMS or email from their profile page.` 
    });
  };

  const exportToCSV = (data: Violation[]) => {
    const headers = ['Date', 'Customer', 'Cart', 'Type', 'Severity', 'Status', 'Description', 'Resolution'];
    const rows = data.map(v => [
      new Date(v.created_at).toLocaleDateString(),
      v.manual_customer_name || v.customer?.full_name || v.customer?.email || 'N/A',
      `${v.cart_name || 'N/A'} #${v.cart_number || 'N/A'}`,
      v.violation_type,
      v.severity,
      v.status,
      v.description.replace(/,/g, ';'),
      v.resolution_notes?.replace(/,/g, ';') || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `violations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: 'Export successful', description: 'CSV file downloaded' });
  };

  const getCartInitials = (cartName: string | null) => {
    if (!cartName) return '?';
    return cartName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const resetForm = () => {
    setEditingViolation(null);
    setIsManualEntry(false);
    setFormData({ 
      customer_id: '', 
      manual_customer_name: '',
      cart_name: '',
      cart_number: '',
      violation_type: '', 
      description: '', 
      severity: 'medium' 
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

  const violationsData = useMemo(() => {
    // Filter violations based on search and filters
    let filtered = violations;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(v => 
        v.cart_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.cart_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.violation_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.manual_customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(v => {
        const vDate = new Date(v.created_at);
        return vDate >= dateRange.from! && vDate <= dateRange.to!;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(v => v.severity === severityFilter);
    }

    const active = filtered.filter(v => v.status === 'pending' || v.status === 'in_review');
    const history = filtered.filter(v => v.status === 'resolved' || v.status === 'dismissed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const bySeverity = {
      critical: active.filter(v => v.severity === 'critical'),
      high: active.filter(v => v.severity === 'high'),
      medium: active.filter(v => v.severity === 'medium'),
      low: active.filter(v => v.severity === 'low'),
    };

    const historyBySeverity = {
      critical: history.filter(v => v.severity === 'critical'),
      high: history.filter(v => v.severity === 'high'),
      medium: history.filter(v => v.severity === 'medium'),
      low: history.filter(v => v.severity === 'low'),
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

    const historySeverityGroups = {
      critical: groupByCart(historyBySeverity.critical),
      high: groupByCart(historyBySeverity.high),
      medium: groupByCart(historyBySeverity.medium),
      low: groupByCart(historyBySeverity.low),
    };

    const totalActive = active.length;
    const cartViolationCounts = active.reduce((acc, v) => {
      const cartKey = v.cart_number || v.customer.cart_number || 'Unknown';
      const cartName = v.cart_name || v.customer.cart_name || 'Unknown Cart';
      if (!acc[cartKey]) {
        acc[cartKey] = {
          cart_name: cartName,
          cart_number: cartKey,
          customer_id: v.customer_id || null,
          violations: []
        };
      }
      acc[cartKey].violations.push(v);
      return acc;
    }, {} as Record<string, { cart_name: string; cart_number: string; customer_id: string | null; violations: Violation[] }>);
    
    const topCarts = Object.entries(cartViolationCounts)
      .sort(([, a], [, b]) => b.violations.length - a.violations.length)
      .slice(0, 3)
      .map(([cart, data]) => ({ 
        cart, 
        cart_name: data.cart_name,
        cart_number: data.cart_number,
        count: data.violations.length,
        customer_id: data.customer_id,
        violations: data.violations
      }));

    return {
      active,
      history,
      bySeverity,
      historyBySeverity,
      severityGroups,
      historySeverityGroups,
      metrics: {
        totalActive,
        criticalCount: bySeverity.critical.length,
        highCount: bySeverity.high.length,
        mediumCount: bySeverity.medium.length,
        lowCount: bySeverity.low.length,
        topCarts
      }
    };
  }, [violations, searchQuery, dateRange, statusFilter, severityFilter]);

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
                  <Label className="text-right">Entry Type</Label>
                  <div className="col-span-3 flex gap-2">
                    <Button
                      type="button"
                      variant={!isManualEntry ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsManualEntry(false)}
                    >
                      Select Customer
                    </Button>
                    <Button
                      type="button"
                      variant={isManualEntry ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsManualEntry(true)}
                    >
                      Manual Entry
                    </Button>
                  </div>
                </div>

                {!isManualEntry ? (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer_id" className="text-right">
                      Customer
                    </Label>
                    <Select 
                      value={formData.customer_id} 
                      onValueChange={(value) => {
                        const customer = customers.find(c => c.id === value);
                        setFormData({ 
                          ...formData, 
                          customer_id: value,
                          cart_name: customer?.cart_name || '',
                          cart_number: customer?.cart_number || ''
                        });
                      }}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.full_name || customer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="manual_customer_name" className="text-right">
                      Customer Name
                    </Label>
                    <Input 
                      id="manual_customer_name" 
                      value={formData.manual_customer_name} 
                      className="col-span-3" 
                      placeholder="Enter customer name"
                      onChange={(e) => setFormData({ ...formData, manual_customer_name: e.target.value })} 
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cart_name" className="text-right">
                    Cart Name
                  </Label>
                  <Select 
                    value={formData.cart_name} 
                    onValueChange={(value) => {
                      const selectedCart = carts.find(c => c.cart_name === value);
                      setFormData({ 
                        ...formData, 
                        cart_name: value,
                        cart_number: selectedCart?.cart_number || formData.cart_number
                      });
                    }}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select cart name" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(carts.map(c => c.cart_name).filter((name): name is string => !!name))).map((cartName) => (
                        <SelectItem key={cartName} value={cartName}>
                          {cartName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cart_number" className="text-right">
                    Cart Number
                  </Label>
                  <Select 
                    value={formData.cart_number} 
                    onValueChange={(value) => setFormData({ ...formData, cart_number: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select cart number" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(carts.map(c => c.cart_number).filter((num): num is string => !!num))).map((cartNumber) => (
                        <SelectItem key={cartNumber} value={cartNumber}>
                          {cartNumber}
                        </SelectItem>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCart(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {getCartInitials(selectedCart.data.cart_name)}
                    </span>
                  </div>
                  <div>
                    <CardTitle>
                      {selectedCart.data.cart_name} ({selectedCart.data.cart_number})
                    </CardTitle>
                    <CardDescription>
                      {selectedCart.data.violations.length} violation(s) - Severity: {selectedCart.severity}
                    </CardDescription>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleContactCustomer(selectedCart.data.customer, selectedCart.data.violations[0]?.manual_customer_name)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </Button>
                {(selectedCart.data.violations.some((v: Violation) => v.status === 'pending' || v.status === 'in_review')) && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleResolveAll(selectedCart.data.violations.filter((v: Violation) => v.status === 'pending' || v.status === 'in_review'))}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve All
                  </Button>
                )}
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
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 animate-fade-in"
                onClick={() => setSelectedCart({ cartKey, severity: selectedSeverity, data: cartData })}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {getCartInitials(cartData.cart_name)}
                      </span>
                    </div>
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
          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by cart name, number, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                  <div className="p-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setDateRange({ from: undefined, to: undefined })}
                    >
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => exportToCSV(violations)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="animate-fade-in border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle>Active Violations</CardTitle>
                  <CardDescription>Total number of active violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{violationsData.metrics.totalActive}</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle>Critical</CardTitle>
                  <CardDescription>Number of critical violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{violationsData.metrics.criticalCount}</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle>High</CardTitle>
                  <CardDescription>Number of high violations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{violationsData.metrics.highCount}</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
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
                  <div className="space-y-3">
                    {violationsData.metrics.topCarts.map((item) => {
                      const cartViolations = violationsData.active.filter(
                        v => (v.cart_number || v.customer.cart_number) === item.cart_number
                      );
                      const sampleViolation = cartViolations[0];
                      const customer = sampleViolation?.customer;
                      const ownerInfo = item.customer_id ? cartOwners[item.customer_id] : null;
                      
                      return (
                        <div key={item.cart} className="p-4 border rounded-lg hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <ShoppingCart className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="font-semibold">{item.cart_name}</div>
                                  <div className="text-sm text-muted-foreground">Cart #{item.cart_number}</div>
                                </div>
                              </div>
                              {customer && (
                                <div className="text-sm text-muted-foreground pl-13">
                                  <span className="font-medium">Customer:</span> {customer.full_name || customer.email}
                                </div>
                              )}
                              {ownerInfo && (
                                <div className="text-sm text-muted-foreground pl-13">
                                  <span className="font-medium">Owner:</span> {ownerInfo.full_name || 'N/A'}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">{item.count} Violations</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const severities = ['critical', 'high', 'medium', 'low'] as const;
                                  for (const severity of severities) {
                                    const cartData = violationsData.severityGroups[severity]?.[item.cart_number];
                                    if (cartData) {
                                      setSelectedSeverity(severity);
                                      setTimeout(() => {
                                        setSelectedCart({ 
                                          cartKey: item.cart_number, 
                                          severity, 
                                          data: cartData 
                                        });
                                      }, 0);
                                      break;
                                    }
                                  }
                                }}
                              >
                                Preview
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

                const borderColors = {
                  critical: 'border-l-4 border-l-destructive',
                  high: 'border-l-4 border-l-orange-500',
                  medium: 'border-l-4 border-l-yellow-500',
                  low: 'border-l-4 border-l-blue-500'
                };

                // Get up to 3 images from violations with images
                const imagesPreview = violationsData.bySeverity[severity]
                  .filter(v => v.images && v.images.length > 0)
                  .slice(0, 3)
                  .flatMap(v => v.images.slice(0, 1))
                  .slice(0, 3);

                return (
                  <Alert
                    key={severity}
                    className={cn(
                      "cursor-pointer hover:shadow-xl transition-all hover:scale-105 animate-fade-in",
                      borderColors[severity]
                    )}
                    onClick={() => setSelectedSeverity(severity)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getSeverityIcon(severity)}
                      <AlertTitle className="capitalize text-xl mb-0">{severity}</AlertTitle>
                    </div>
                    <AlertDescription>
                      <div className="space-y-3 mt-2">
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold">{violationCount}</div>
                          <div className="text-sm">violations</div>
                        </div>
                        <div className="text-sm">
                          across <span className="font-semibold">{cartCount}</span> cart(s)
                        </div>
                        {imagesPreview.length > 0 && (
                          <div className="flex gap-2 pt-2 border-t">
                            {imagesPreview.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 rounded overflow-hidden border">
                                <img
                                  src={img.image_url}
                                  alt="Violation preview"
                                  className="w-full h-full object-cover"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFullScreenImage(img.image_url);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}

          <h2 className="text-xl font-bold mt-8 mb-4">Violation History</h2>
          {selectedHistoryCart ? (
            // Level 3: Show violations for selected cart in history
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedHistoryCart(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle>
                      {selectedHistoryCart.data.cart_name} - #{selectedHistoryCart.data.cart_number}
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {selectedHistorySeverity} severity violations history
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ViolationsTable
                  violations={selectedHistoryCart.data.violations}
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
          ) : selectedHistorySeverity ? (
            // Level 2: Show carts for selected severity in history
            <>
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHistorySeverity(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold capitalize">{selectedHistorySeverity} Severity - History</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(violationsData.historySeverityGroups[selectedHistorySeverity] || {}).map(([cartKey, cartData]: [string, any]) => (
                  <Card
                    key={cartKey}
                    className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 animate-fade-in"
                    onClick={() => setSelectedHistoryCart({ cartKey, severity: selectedHistorySeverity, data: cartData })}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {getCartInitials(cartData.cart_name)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{cartData.cart_name}</CardTitle>
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
                          <Badge variant={getSeverityColor(selectedHistorySeverity)}>
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
            // Level 1: Show severity cards for history
            <>
              {violationsData.history.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No violation history</AlertTitle>
                  <AlertDescription>There are no resolved or dismissed violations.</AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
                    const cartCount = Object.keys(violationsData.historySeverityGroups[severity] || {}).length;
                    const violationCount = violationsData.historyBySeverity[severity].length;
                    
                    if (cartCount === 0) return null;

                    const borderColors = {
                      critical: 'border-l-4 border-l-destructive',
                      high: 'border-l-4 border-l-orange-500',
                      medium: 'border-l-4 border-l-yellow-500',
                      low: 'border-l-4 border-l-blue-500'
                    };

                    return (
                      <Card
                        key={severity}
                        className={cn(
                          "cursor-pointer hover:shadow-xl transition-all hover:scale-105 animate-fade-in",
                          borderColors[severity]
                        )}
                        onClick={() => setSelectedHistorySeverity(severity)}
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
            </>
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
