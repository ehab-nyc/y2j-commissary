import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Database, Download, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BackupLog {
  id: string;
  backup_date: string;
  backup_type: string;
  tables_included: string[];
  file_size_bytes: number | null;
  status: string;
  notes: string | null;
}

const BACKUP_TABLES = [
  { name: 'orders', label: 'Orders', description: 'Customer orders and order history' },
  { name: 'order_items', label: 'Order Items', description: 'Individual items in orders' },
  { name: 'products', label: 'Products', description: 'Product catalog and inventory' },
  { name: 'categories', label: 'Categories', description: 'Product categories' },
  { name: 'profiles', label: 'Customers', description: 'Customer profiles and information' },
  { name: 'returns', label: 'Returns', description: 'Return records' },
  { name: 'weekly_balances', label: 'Weekly Balances', description: 'Customer billing records' },
  { name: 'violations', label: 'Violations', description: 'Violation reports' },
];

export default function DataBackup() {
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map(t => t.name));

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .order('backup_date', { ascending: false })
      .limit(20);

    if (error) {
      toast.error('Failed to fetch backup history');
      console.error(error);
    } else {
      setBackups(data || []);
    }
    setLoading(false);
  };

  const createBackup = async () => {
    if (selectedTables.length === 0) {
      toast.error('Please select at least one table to backup');
      return;
    }

    setCreating(true);
    try {
      // Fetch data from selected tables
      const backupData: { [key: string]: any[] } = {};
      let totalSize = 0;

      for (const table of selectedTables) {
        try {
          const { data, error } = await supabase
            .from(table as any)
            .select('*');

          if (error) {
            console.error(`Error backing up ${table}:`, error);
            toast.error(`Failed to backup ${table}`);
            continue;
          }

          backupData[table] = data || [];
          totalSize += JSON.stringify(data).length;
        } catch (err) {
          console.error(`Error backing up ${table}:`, err);
          continue;
        }
      }

      // Create backup file
      const backupContent = {
        backup_date: new Date().toISOString(),
        tables: backupData,
        metadata: {
          version: '1.0',
          tables_included: selectedTables,
          record_counts: Object.fromEntries(
            Object.entries(backupData).map(([table, data]) => [table, data.length])
          )
        }
      };

      const blob = new Blob([JSON.stringify(backupContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commissary-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the backup
      const { data: user } = await supabase.auth.getUser();
      await supabase
        .from('backup_logs')
        .insert({
          backup_type: 'manual',
          tables_included: selectedTables,
          file_size_bytes: totalSize,
          status: 'completed',
          created_by: user.user?.id,
          notes: `Manual backup of ${selectedTables.length} tables`
        });

      toast.success('Backup created and downloaded successfully');
      fetchBackups();
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev =>
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAll = () => {
    setSelectedTables(BACKUP_TABLES.map(t => t.name));
  };

  const selectNone = () => {
    setSelectedTables([]);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <BackButton />
          <h1 className="text-3xl font-bold mt-2">Data Backup & Export</h1>
          <p className="text-muted-foreground">Create and manage database backups</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Backups are exported as JSON files containing your selected data. Store them securely and regularly update backups to prevent data loss.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Create New Backup
            </CardTitle>
            <CardDescription>
              Select tables to include in your backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Clear All
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {BACKUP_TABLES.map((table) => (
                <div key={table.name} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={table.name}
                    checked={selectedTables.includes(table.name)}
                    onCheckedChange={() => toggleTable(table.name)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={table.name} className="font-medium cursor-pointer">
                      {table.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {table.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Selected: {selectedTables.length} tables</p>
              <Button
                onClick={createBackup}
                disabled={creating || selectedTables.length === 0}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {creating ? 'Creating Backup...' : 'Create & Download Backup'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Backup History
            </CardTitle>
            <CardDescription>
              Recent backup operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading backup history...</div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No backups found. Create your first backup above.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tables</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        {format(new Date(backup.backup_date), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="capitalize">
                        <Badge variant="outline">{backup.backup_type}</Badge>
                      </TableCell>
                      <TableCell>{backup.tables_included.length} tables</TableCell>
                      <TableCell>{formatFileSize(backup.file_size_bytes)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            backup.status === 'completed'
                              ? 'bg-green-500'
                              : backup.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }
                        >
                          {backup.status}
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
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• <strong>Regular Backups:</strong> Create backups weekly or before major changes</p>
            <p>• <strong>Secure Storage:</strong> Store backups in a secure location separate from your application</p>
            <p>• <strong>Test Restores:</strong> Periodically verify backups can be restored successfully</p>
            <p>• <strong>Multiple Copies:</strong> Maintain several backup copies at different intervals</p>
            <p>• <strong>Documentation:</strong> Note what each backup contains and when it was created</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
