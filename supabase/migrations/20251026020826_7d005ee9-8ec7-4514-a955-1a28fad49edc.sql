-- Add DELETE policy for admins on weekly_summary_snapshots
CREATE POLICY "Admins can delete snapshots"
ON public.weekly_summary_snapshots
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));