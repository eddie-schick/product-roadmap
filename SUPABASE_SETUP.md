# Supabase Setup Instructions

## Issue: Row Level Security (RLS) Blocking Access

The application is unable to read or write data because Supabase Row Level Security (RLS) is enabled on the `roadmap_fields` table without any policies allowing anonymous access.

## Solution: Configure RLS Policies

You have two options:

### Option 1: Disable RLS (Quick Fix - Not Recommended for Production)

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `tbklpgmjkcncafpinmum`
3. Navigate to **Authentication** → **Policies**
4. Find the `roadmap_fields` table
5. Click **Disable RLS** button

⚠️ **Warning**: This makes the table completely public with no security restrictions.

### Option 2: Add Permissive Policies (Recommended)

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `tbklpgmjkcncafpinmum`
3. Navigate to **Authentication** → **Policies**
4. Find the `roadmap_fields` table
5. Click **New Policy** and add these four policies:

#### Policy 1: Allow SELECT (Read)
```sql
CREATE POLICY "Allow public read access"
ON public.roadmap_fields
FOR SELECT
TO anon
USING (true);
```

#### Policy 2: Allow INSERT (Create)
```sql
CREATE POLICY "Allow public insert access"
ON public.roadmap_fields
FOR INSERT
TO anon
WITH CHECK (true);
```

#### Policy 3: Allow UPDATE (Edit)
```sql
CREATE POLICY "Allow public update access"
ON public.roadmap_fields
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
```

#### Policy 4: Allow DELETE (Remove)
```sql
CREATE POLICY "Allow public delete access"
ON public.roadmap_fields
FOR DELETE
TO anon
USING (true);
```

### Option 3: Use SQL Editor (Fastest)

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this SQL script:

```sql
-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access" ON public.roadmap_fields;
DROP POLICY IF EXISTS "Allow public insert access" ON public.roadmap_fields;
DROP POLICY IF EXISTS "Allow public update access" ON public.roadmap_fields;
DROP POLICY IF EXISTS "Allow public delete access" ON public.roadmap_fields;

-- Create new permissive policies for anonymous users
CREATE POLICY "Allow public read access"
ON public.roadmap_fields
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow public insert access"
ON public.roadmap_fields
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow public update access"
ON public.roadmap_fields
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access"
ON public.roadmap_fields
FOR DELETE
TO anon
USING (true);
```

## Verify the Fix

After applying the policies, refresh the application and you should see:
- Data loading successfully
- Ability to create new initiatives
- Ability to edit existing initiatives
- Ability to delete initiatives

## Additional: Add sort_order Column

For drag-and-drop prioritization in the Backlog tab to work properly, add this column:

```sql
ALTER TABLE public.roadmap_fields 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
```

## Data Import

If you haven't imported your 86 rows of data yet, you can:
1. Use Supabase Dashboard → Table Editor → Import CSV
2. Or use the SQL Editor to insert data
3. Or use the application's "New Initiative" button to create entries manually
