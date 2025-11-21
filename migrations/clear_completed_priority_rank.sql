-- Migration: Clear priority_rank for all initiatives with 'Completed' status
-- This ensures that completed initiatives don't have priority rankings
-- Run this migration in your Supabase SQL editor

UPDATE public.roadmap_fields
SET priority_rank = NULL
WHERE "Status" = 'Completed'
  AND priority_rank IS NOT NULL;

-- Optional: Verify the update
-- SELECT COUNT(*) as completed_with_priority_rank
-- FROM public.roadmap_fields
-- WHERE "Status" = 'Completed' AND priority_rank IS NOT NULL;
-- Should return 0 after running the migration





