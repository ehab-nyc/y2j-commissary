import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, X, Edit, Trash2, Clock, User, Calendar, Image as ImageIcon } from 'lucide-react';

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

interface ViolationsTableProps {
  violations: Violation[];
  hasRole: (role: string) => boolean;
  updateStatus: (id: string, status: string, notes?: string) => Promise<void>;
  handleEdit: (violation: Violation) => void;
  handleDelete: (id: string) => Promise<void>;
  setFullScreenImage: (url: string | null) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getSeverityColor: (severity: string) => "default" | "secondary" | "destructive" | "outline";
}

export function ViolationsTable({
  violations,
  hasRole,
  updateStatus,
  handleEdit,
  handleDelete,
  setFullScreenImage,
  getStatusIcon,
  getSeverityColor
}: ViolationsTableProps) {
  return (
    <div className="grid gap-4">
      {violations.map((violation) => (
        <Card key={violation.id} className="overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">{violation.violation_type}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(violation.severity)}>
                    {violation.severity}
                  </Badge>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(violation.status)}
                    <Badge variant="outline">{violation.status}</Badge>
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Description */}
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Description</p>
              <p className="text-sm">{violation.description}</p>
            </div>

            <Separator />

            {/* Images */}
            {violation.images.length > 0 && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Images ({violation.images.length})</p>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {violation.images.map((image) => (
                      <img
                        key={image.id}
                        src={image.image_url}
                        alt="Violation evidence"
                        className="aspect-square rounded-lg object-cover cursor-pointer hover:opacity-80 transition-all hover:scale-105 border"
                        onClick={() => setFullScreenImage(image.image_url)}
                      />
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Customer</p>
                  <p className="text-sm font-medium">
                    {violation.manual_customer_name || violation.customer?.full_name || violation.customer?.email || 'N/A'}
                  </p>
                  {violation.cart_name && (
                    <p className="text-xs text-muted-foreground mt-1">Cart: {violation.cart_name}</p>
                  )}
                  {violation.cart_number && (
                    <p className="text-xs text-muted-foreground">Cart #: {violation.cart_number}</p>
                  )}
                </div>
              </div>

              {/* Inspector */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Inspector</p>
                  <p className="text-sm font-medium">
                    {violation.inspector.full_name || violation.inspector.email}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reported Date</p>
                  <p className="text-sm font-medium">
                    {new Date(violation.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Resolution Notes */}
            {violation.resolution_notes && (
              <>
                <Separator />
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Resolution Notes</AlertTitle>
                  <AlertDescription>{violation.resolution_notes}</AlertDescription>
                </Alert>
              </>
            )}

            {/* Actions */}
            <Separator />
            <div className="flex flex-wrap gap-2">
              {violation.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus(violation.id, 'in_review')}
                >
                  <Clock className="w-4 h-4 mr-2" />
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
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(violation.id, 'dismissed')}
                  >
                    <X className="w-4 h-4 mr-2" />
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
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
