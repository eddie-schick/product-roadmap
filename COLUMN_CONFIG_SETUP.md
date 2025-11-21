# Column Configuration System Setup

## Quick Start

The column management system requires the `column_config` table to be created in Supabase. Follow these steps:

## Step 1: Run the Migration SQL

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `tbklpgmjkcncafpinmum`
3. Navigate to **SQL Editor**
4. Open the file `column_config_migration.sql` from this project
5. Copy and paste the entire contents into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

This will:
- Create the `column_config` table
- Populate it with all existing columns from `roadmap_fields`
- Create the functions for adding/dropping columns dynamically
- Set up Row Level Security (RLS) policies

## Step 2: Verify the Setup

After running the migration, verify:

1. **Check the table exists:**
   - Go to **Table Editor** in Supabase Dashboard
   - You should see `column_config` table with ~28 rows

2. **Check RLS policies:**
   - Go to **Authentication** → **Policies**
   - Find `column_config` table
   - You should see 4 policies:
     - Allow public read access
     - Allow public insert access
     - Allow public update access
     - Allow public delete access

3. **Test in the app:**
   - Refresh your application
   - The "No columns configured" message should disappear
   - You should see all columns in the table view
   - Click "Manage Columns" to see the column manager

## Troubleshooting

### Error: "relation column_config does not exist"
- The migration hasn't been run yet
- Go back to Step 1 and run the SQL migration

### Error: "permission denied for table column_config"
- RLS policies are not set up correctly
- Re-run the RLS policy section of the migration:
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON public.column_config;
DROP POLICY IF EXISTS "Allow public insert access" ON public.column_config;
DROP POLICY IF EXISTS "Allow public update access" ON public.column_config;
DROP POLICY IF EXISTS "Allow public delete access" ON public.column_config;

-- Recreate policies
CREATE POLICY "Allow public read access" ON public.column_config
  FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert access" ON public.column_config
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.column_config
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.column_config
  FOR DELETE TO anon USING (true);
```

### Error: "function add_column_to_roadmap does not exist"
- The migration didn't complete fully
- Re-run the entire migration SQL file

### Columns not showing in the table
- Check that columns have `is_visible = true` in the `column_config` table
- Use "Manage Columns" in the app to show/hide columns

## What the Migration Does

1. **Creates `column_config` table** - Stores metadata about all columns
2. **Seeds existing columns** - Adds all current columns from `roadmap_fields` as system columns
3. **Creates helper functions:**
   - `add_column_to_roadmap()` - Dynamically adds new columns to `roadmap_fields`
   - `drop_column_from_roadmap()` - Safely removes custom columns
4. **Sets up security** - RLS policies allow anonymous access (same as `roadmap_fields`)

## Next Steps

Once the migration is complete:
- ✅ Columns will automatically load from Supabase
- ✅ You can show/hide columns via "Manage Columns"
- ✅ You can reorder columns via drag-and-drop
- ✅ You can add new custom columns dynamically
- ✅ All changes persist across page refreshes

