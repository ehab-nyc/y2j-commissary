import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const resolutionNotesSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(10, 'Resolution notes must be at least 10 characters')
    .max(500, 'Resolution notes must not exceed 500 characters')
    .regex(/^[a-zA-Z0-9\s.,!?;:()\-'"]+$/, 'Notes contain invalid characters'),
});

type ResolutionNotesForm = z.infer<typeof resolutionNotesSchema>;

interface ResolutionNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (notes: string) => void | Promise<void>;
  title?: string;
  description?: string;
}

export function ResolutionNotesDialog({
  open,
  onOpenChange,
  onSubmit,
  title = 'Resolution Notes',
  description = 'Please provide details about how this violation was resolved.',
}: ResolutionNotesDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResolutionNotesForm>({
    resolver: zodResolver(resolutionNotesSchema),
    defaultValues: {
      notes: '',
    },
  });

  const handleSubmit = async (data: ResolutionNotesForm) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data.notes);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter detailed resolution notes (10-500 characters)..."
                      className="min-h-[120px] resize-none"
                      maxLength={500}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <FormMessage />
                    <span>{field.value.length}/500</span>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
