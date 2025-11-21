# SHAED Product Roadmap - TODO

## Core Setup
- [x] Install Supabase client and dependencies
- [x] Set up Supabase client configuration
- [x] Create TypeScript types for Initiative
- [x] Create custom hooks (useInitiatives, useLocalStorage)

## Main Layout
- [x] Header with title, view toggle, and filters
- [x] Tab navigation (Active, Completed, Backlog)
- [x] Product filter dropdown
- [x] Search functionality
- [x] New Initiative button

## List View
- [x] Display all columns from roadmap_fields table
- [x] Sortable columns (click header to sort)
- [x] Resizable columns (drag border)
- [x] Reorderable columns (drag header)
- [x] Persist column preferences to localStorage
- [x] Pagination (10/25/50/100/All options)
- [x] Sticky header when viewing all
- [x] Click row opens Initiative Detail Popup
- [x] Status badges with color coding

## Gantt Chart View
- [x] Horizontal timeline bars (NOT vertical)
- [x] Color bars by Product Dev Status
- [x] Derive dates from Quarter Due if not set
- [x] Click bar to open Initiative Detail Popup
- [x] Drag bar ends to adjust Start/End dates
- [x] Auto-scroll to current date on load
- [x] Hover tooltip with initiative details

## Initiative Detail Popup
- [x] Single scrollable view (no tabs)
- [x] Move to dropdown (change Status)
- [x] All fields inline editable
- [x] Auto-save on blur with debounce (500ms)
- [x] Saving indicator
- [x] Delete button with confirmation
- [x] Fields mirror list column order

## Backlog Prioritization
- [x] Drag-and-drop reordering in Backlog tab
- [x] Visual feedback during drag
- [x] Persist order (add sort_order column if needed)

## Data Operations
- [x] Fetch initiatives by Status and Product
- [x] Create new initiative
- [x] Update initiative fields
- [x] Delete initiative
- [x] Search across text fields

## UI/UX Polish
- [x] Loading spinners for async operations
- [x] Success/error toast notifications
- [x] Hover states on interactive elements
- [x] Responsive design (desktop-focused)
- [x] Clean professional aesthetic

#### Known Issues / User Action Required
- [x] **CRITICAL**: Supabase RLS policies configured successfully
- [x] Data imported successfully (75 rows total across all statuses)
- [ ] sort_order column should be added to database for persistent Backlog prioritization (optional enhancement)

## Resolved Issues
- [x] Configure Supabase RLS policies to allow anonymous access - RESOLVED
- [x] Fix application errors - RESOLVED (Gantt chart styling fixed)

- [x] Fix TypeError: column.accessor is not a function in ListView component
