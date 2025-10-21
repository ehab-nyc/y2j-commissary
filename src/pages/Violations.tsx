import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertCircle, CheckCircle, Clock, X, Trash2, Edit } from 'lucide-react';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'dismissed': return <X className="h-4 w-4" />;
      case 'in_review': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

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
          <h1 className="text-3xl font-bold">Cart Violations</h1>
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

        <div className="grid gap-4">
          {violations.map((violation) => (
            <Card key={violation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(violation.status)}
                      {violation.violation_type}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Customer: {violation.customer.full_name || violation.customer.email}
                      {violation.cart_name && ` - Cart: ${violation.cart_name} ${violation.cart_number || ''}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reported by: {violation.inspector.full_name || violation.inspector.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getSeverityColor(violation.severity)}>
                      {violation.severity}
                    </Badge>
                    <Badge variant="outline">{violation.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{violation.description}</p>
                
                {violation.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {violation.images.map((image) => (
                      <img
                        key={image.id}
                        src={image.image_url}
                        alt="Violation"
                        className="rounded-lg object-cover w-full h-32 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setFullScreenImage(image.image_url)}
                      />
                    ))}
                  </div>
                )}

                {violation.resolution_notes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium">Resolution Notes:</p>
                    <p className="text-sm">{violation.resolution_notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
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
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(violation.id, 'dismissed')}
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>

                {hasRole('super_admin') && (
                  <div className="flex gap-2 pt-2 border-t">
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
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Reported: {new Date(violation.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}

          {violations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No violations reported yet</p>
              </CardContent>
            </Card>
          )}
        </div>
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
