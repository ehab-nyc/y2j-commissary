import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, X, Edit, Trash2, Clock } from 'lucide-react';

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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Images</TableHead>
            <TableHead>Inspector</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {violations.map((violation) => (
            <TableRow key={violation.id}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{violation.violation_type}</span>
                  <Badge variant={getSeverityColor(violation.severity)} className="w-fit">
                    {violation.severity}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                <p className="text-sm line-clamp-2">{violation.description}</p>
                {violation.resolution_notes && (
                  <Alert className="mt-2">
                    <AlertTitle className="text-xs">Resolution</AlertTitle>
                    <AlertDescription className="text-xs">{violation.resolution_notes}</AlertDescription>
                  </Alert>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(violation.status)}
                  <Badge variant="outline">{violation.status}</Badge>
                </div>
              </TableCell>
              <TableCell>
                {violation.images.length > 0 ? (
                  <div className="flex gap-1">
                    {violation.images.slice(0, 3).map((image) => (
                      <img
                        key={image.id}
                        src={image.image_url}
                        alt="Violation"
                        className="h-12 w-12 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setFullScreenImage(image.image_url)}
                      />
                    ))}
                    {violation.images.length > 3 && (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-xs">
                        +{violation.images.length - 3}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No images</span>
                )}
              </TableCell>
              <TableCell>
                <p className="text-sm">{violation.inspector.full_name || violation.inspector.email}</p>
              </TableCell>
              <TableCell>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(violation.created_at).toLocaleDateString()}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {violation.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(violation.id, 'in_review');
                      }}
                    >
                      <Clock className="w-3 h-3" />
                    </Button>
                  )}
                  {(violation.status === 'pending' || violation.status === 'in_review') && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const notes = prompt('Enter resolution notes:');
                          if (notes) updateStatus(violation.id, 'resolved', notes);
                        }}
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(violation.id, 'dismissed');
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {hasRole('super_admin') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(violation);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Violation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this violation and all associated images.
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
