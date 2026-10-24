---
name: sx-crm-usability
description: |
  SX CRM usability and interaction patterns. Use this skill when fixing bugs, creating new features, or designing workflows in the SX-CRM app. This skill covers actionable usability rules and UX patterns (NOT visual design like colors, spacing, responsive layouts, or animations). Apply these rules to all UI interactions, forms, data displays, and workflows to ensure consistency and good user experience across the application.
compatibility:
  requires:
    - Next.js
    - React
    - Zustand
    - shadcn/ui
    - Tailwind CSS
---

# SX CRM Usability Rules

This skill codifies usability and interaction patterns specific to SX-CRM. These rules should guide development when fixing bugs or creating new features.

## Rule 1: Large Data Collections Require Findability

**When to apply:** Any list/table with 10+ items (customers, leads, opportunities, contacts, events, tasks)

**Pattern:**
- Add a search bar that filters in real-time
- Support filtering by key attributes (status, owner, date ranges)
- Display record count: "12 leads" or "Showing 5 of 47"
- Provide sorting by primary column (name, date, value)
- Add column selection/visibility toggle for tables

**Why:** Users need to find specific items quickly without scrolling through hundreds of records.

**Quick checklist:**
- [ ] Search filters in real-time
- [ ] Relevant filter options (status, date, owner)
- [ ] Record count displayed
- [ ] Sort by important columns

---

## Rule 2: Prevent Accidental Duplicates

**When to apply:** Creating leads, opportunities, contacts, events, or any core data entity

**Pattern:**
```
User enters "Acme Corp"
↓
Check: Does "Acme Corp" (fuzzy match) already exist?
↓
If YES: Show existing record with option to:
  - Link/relate to existing
  - Create anyway (with warning)
  - Cancel
If NO: Allow creation
```

**Why:** Users often forget they already created a record, leading to data mess and confusion.

**Implementation:**
- Use fuzzy matching on name/email fields during creation
- Show inline warning before confirming
- Link to existing record for comparison
- Optional: Add "Check for duplicates" button in form

**Quick checklist:**
- [ ] Duplicate check on creation
- [ ] Fuzzy matching (handles typos, spacing)
- [ ] Warning shows existing record
- [ ] Option to view/link existing

---

## Rule 3: Require Confirmation for Deletions

**When to apply:** Deleting any data (leads, opportunities, contacts, events, tasks, notes)

**Pattern:**
```
User clicks delete
↓
Modal appears: "Delete 'Acme Corp Q2'?"
  Deleting this lead will remove all related events, tasks, and notes.
  [Cancel] [Delete]
↓
On confirm: Show success toast with undo option (5 sec)
```

**Why:** Deleted data is often unrecoverable; users need time to reconsider.

**Implementation:**
- Always show what's being deleted (name, type, related count)
- Explain what else gets deleted (events, tasks, notes)
- Provide undo within 5 seconds post-delete
- Use destructive button styling (red or warning color)

**Quick checklist:**
- [ ] Modal shows item name and type
- [ ] Explains cascading deletes
- [ ] Undo option in success toast (5 sec)
- [ ] Destructive button styling

---

## Rule 4: Forms Guide Users Clearly

**When to apply:** Any form (create lead, edit contact, add event, log task)

**Pattern:**
```
Form sections:
┌─ Basic Info
│  ├─ Name (required)
│  ├─ Email (required)
│  └─ Phone
├─ Details
│  ├─ Description (long text)
│  └─ Tags
└─ Actions
   ├─ [Cancel] [Save]
```

**Why:** Clear structure reduces form errors and abandonment.

**Implementation:**
- Group related fields with section headers
- Mark required fields with asterisk (*)
- Show inline validation errors (red text below field)
- Disable submit until all required fields filled
- Provide cancel option to abandon without saving
- Show confirmation if unsaved changes exist

**Quick checklist:**
- [ ] Fields grouped logically
- [ ] Required fields marked
- [ ] Inline validation errors
- [ ] Submit disabled until valid
- [ ] Unsaved changes warning on exit

---

## Rule 5: Empty States Are Helpful, Not Blank

**When to apply:** Lists/tables with zero items (no leads, no events, no tasks)

**Pattern:**
```
┌─────────────────────────┐
│    🎯 No leads yet      │
│                         │
│  You haven't created    │
│  any leads. Start by    │
│  adding your first one. │
│                         │
│  [+ Create Lead]        │
└─────────────────────────┘
```

**Why:** Users don't know what to do with an empty screen.

**Implementation:**
- Show icon/illustration (optional but friendly)
- Explain what would appear here
- Provide direct CTA button to create item
- Keep tone encouraging, not scolding

**Quick checklist:**
- [ ] Descriptive message (explain state)
- [ ] Action button provided
- [ ] Tone is helpful/encouraging

---

## Rule 6: Bulk Actions Need Clear Selection & Confirmation

**When to apply:** Multi-select operations (bulk assign, bulk tag, bulk status change, bulk delete)

**Pattern:**
```
User selects 3 leads → Selection bar appears:
┌────────────────────────────────────────┐
│ 3 items selected [Select All] [Clear]  │
│                                        │
│ [Change Status ▼] [Assign ▼] [Delete] │
└────────────────────────────────────────┘

User clicks "Delete"
↓
Modal: "Delete 3 items? This cannot be undone."
[Cancel] [Delete]
```

**Why:** Bulk actions are powerful; accidental bulk deletes are catastrophic.

**Implementation:**
- Show selection count prominently
- Sticky toolbar shows only when items selected
- All bulk actions require confirmation modal
- Modal shows count and impact of action
- Provide undo for 5 seconds post-action

**Quick checklist:**
- [ ] Selection count visible
- [ ] Bulk action buttons appear
- [ ] Confirmation modal shows impact
- [ ] Undo available post-action

---

## Rule 7: Drag-Drop Provides Feedback

**When to apply:** Moving cards/items between stages/columns (Kanban boards, pipeline stages)

**Pattern:**
```
Before drag: Card in "Prospect" column

During drag: Card semi-transparent, ghost image follows cursor
             Target column highlights (blue border, slight expansion)

After drop:  Card slides into new column
             Card briefly highlights (yellow glow, 1 sec)
             Toast: "Moved to Negotiation"
             Optional: [Undo] button
```

**Why:** Users need visual confirmation that the drag worked and where item landed.

**Implementation:**
- Semi-transparent drag ghost
- Target column highlights on hover
- Card animates into new position smoothly
- Brief highlight animation in destination
- Toast notification with action name
- Undo available for 5 seconds

**Quick checklist:**
- [ ] Drag ghost is visible and follows cursor
- [ ] Target highlights on hover
- [ ] Smooth animation into destination
- [ ] Toast confirms action + undo option

---

## Rule 8: Modals Are Focused & Closeable

**When to apply:** Forms, confirmations, detailed views in modals/dialogs

**Pattern:**
```
┌─────────────────────────────────┐
│ Edit Lead                   [×] │  ← Close button always present
├─────────────────────────────────┤
│ Name: Acme Corp                 │
│ Email: contact@acme.com         │
│                                 │
│ [Cancel]              [Save]    │  ← Clear action buttons
└─────────────────────────────────┘

Clicking outside modal: No close (prevent accidental)
ESC key: Closes if no unsaved changes
```

**Why:** Users need clear ways to exit modals and save/cancel their work.

**Implementation:**
- Always include close button (X) in top-right
- Title clearly states what modal does
- Primary action is obvious (Save = blue, Delete = red)
- ESC key closes modal if safe (no unsaved)
- Clicking outside does not close (prevent accident)
- Show unsaved changes warning on exit

**Quick checklist:**
- [ ] Close button (X) in top-right
- [ ] Clear title
- [ ] Primary action button visible
- [ ] ESC key closes safely
- [ ] Unsaved changes warning

---

## Rule 9: Loading States Keep Users Informed

**When to apply:** Async operations (saving form, moving card, loading list, deleting item, creating record)

**Pattern:**
```
Before: [Save]
During: [Saving...] (button disabled, spinner)
After:  ✓ Saved (toast notification)

Or for list loading:
┌──────────────┐
│ Loading...   │  ← Spinner + text
│   ⟳         │  ← Skeleton or shimmer optional
└──────────────┘
```

**Why:** Without feedback, users click multiple times or think app froze.

**Implementation:**
- Show spinner immediately on action
- Change button text to action-ing state (Saving, Moving, Deleting)
- Disable button during operation
- Success toast on completion
- Error toast with retry option if fails
- Skeleton/shimmer screens for slow loads

**Quick checklist:**
- [ ] Spinner shows during load
- [ ] Button text changes (action-ing)
- [ ] Button disabled during action
- [ ] Success/error toast on completion

---

## Rule 10: Navigation is Clear and Consistent

**When to apply:** Top navigation, sidebar, breadcrumbs, page headers

**Pattern:**
```
Top: Logo | Leads | Opportunities | Contacts | Events | Settings | Profile
      ↑ Current section highlighted

Page: Leads > All Leads > [search]
      ↑ Breadcrumb shows location

Sidebar: [≡] Collapsed/Expandable
         • Leads
         • Opportunities
         • Contacts
         • Events
         • Tasks
         • Reports
```

**Why:** Users need to know where they are and how to get elsewhere.

**Implementation:**
- Main nav always visible (top or sidebar)
- Current section highlighted
- Breadcrumb on detail pages
- Consistent nav structure across app
- Mobile: hamburger menu, collapse non-essentials

**Quick checklist:**
- [ ] Current section highlighted
- [ ] Breadcrumb on detail pages
- [ ] Consistent nav structure
- [ ] Mobile-friendly nav

---

## Rule 11: Long Text Fields Preserve Formatting & Newlines

**When to apply:** Any text field that accepts multiple lines (logs, notes, descriptions, event details, task descriptions, venue details, addresses)

**Pattern:**
```
User input:
Q2 Planning Meeting
Date: June 15
Venue: Building A, Room 302

On save and display:
Acme Corp Notes:
Q2 Planning Meeting
Date: June 15
Venue: Building A, Room 302

(Preserves exact line breaks and formatting)
```

**Why:** Multi-line text loses its structure when newlines are collapsed. Users need to format information for readability, and collapsing it makes it hard to read.

**Implementation:**
- Use `<textarea>` for input, not single-line `<input>`
- Store text with newlines preserved (don't trim/collapse)
- Display with `<pre>` or `white-space: pre-wrap` in CSS
- Support line breaks from Enter key
- Show character count if there's a limit
- In tables/lists, preserve newlines in expanded view (truncate with "..." in compact view)

**Examples:**
- Lead log: "Called at 9am\nDiscussed Q2 budget\nFollowup: Monday 10am"
- Event details: "Venue: Room 302\nAddress: 123 Main St\nParking: Lot B"
- Task description: "Review contract\nCheck legal review\nSend to client"

**Quick checklist:**
- [ ] `<textarea>` for multi-line input
- [ ] Newlines stored and displayed exactly
- [ ] `white-space: pre-wrap` applied
- [ ] Truncate with "..." in compact views
- [ ] Full text visible in expanded/detail view

---

## Rule 12: Editable Data - Make All Relevant Fields Editable

**When to apply:** Any data that might change during work with clients (lead titles, event venue/date, contact info, amounts, dates, owners, notes, metadata)

**Pattern:**
```
Lead view:
Name: Acme Corp Q2 [Edit]
Owner: Sarah Chen [Change]
Amount: $50,000 [Edit]
Date: June 15 [Change]
Notes: Planning phase... [Edit]

Click [Edit] → Inline edit or modal opens
Enter changes → [Save] [Cancel]
```

**Why:** Information changes during client work. Fix wrong assumptions, update when client changes minds, correct data entry errors, change owner/stage as work progresses.

**Implementation:**
- Inline editing: Click field → becomes input → Enter to save
- Or modal editing: Click [Edit] → form opens → Save/Cancel
- Show which fields are editable vs. locked (locked: created date, ID, calculated values)
- Preserve edit history if relevant (show "Last updated 2 hours ago by Sarah")
- Validation on edit (e.g., amount must be > 0)

**Editable fields by entity:**
- **Leads:** Title, description, owner, amount, stage/status, contact info, tags, custom fields
- **Events:** Title, venue, date, time, description, attendees, status
- **Contacts:** Name, email, phone, title, company, notes
- **Opportunities:** Title, amount, stage, close date, description, owner
- **Tasks:** Title, description, due date, assigned to, status

**Non-editable fields:**
- Created date, created by
- Record ID, external IDs
- Calculated fields (win probability, time in stage)
- External API data (unless sync disabled)

**Quick checklist:**
- [ ] All mutable data is editable
- [ ] Clear edit UX (inline or modal)
- [ ] Validation on edit
- [ ] Save/cancel options visible
- [ ] Locked fields appear different (gray, disabled)

---

## Rule 13: Acknowledgment on Create/Move/Status Change

**When to apply:** When user creates a new item, moves a card to another stage/board, or changes status of any item

**Pattern:**
```
User creates lead "Acme Corp"
↓
Toast notification: "Lead created: 'Acme Corp'" [Undo]
Item highlights on screen (yellow glow, 1 sec)
User can see where new item appears in list

User moves lead to "Won"
↓
Toast: "Moved to Won" [Undo]
Card highlights in Won column
User confirms it landed in right place

User marks task as "Complete"
↓
Toast: "Marked complete" [Undo]
Task dims/strikethrough on screen
```

**Why:** Confirmation that action succeeded, visibility that correct item was affected, undo safety for mistakes, reassurance in async operations.

**Implementation:**
- Toast notification with action name (e.g., "Lead created", "Moved to Won", "Event confirmed")
- Include item name in toast if space: "Lead created: 'Acme Corp'"
- Brief item highlight/animation in destination (yellow glow or border flash, 1 sec)
- Undo button in toast (available 5 seconds)
- Auto-dismiss toast after 3-4 seconds
- For moves: Card animates to new column
- For status change: Visual change (color, strike-through, icon) applied immediately

**Toast message examples:**
- Create: "Lead created: 'Acme Corp Q2 Opportunity'"
- Move: "Moved to Won" (show in column where card landed)
- Status: "Event confirmed: 'Q2 Tech Summit'"
- Bulk: "3 items moved to Negotiation" [Undo]

**Quick checklist:**
- [ ] Toast shows action + item name
- [ ] Item highlights in destination
- [ ] Undo available for 5 seconds
- [ ] Toast auto-dismisses after 3-4 sec
- [ ] Visual feedback on status change

---

## Quick Checklist for Applying All Rules

When building a feature or fixing a bug, ask:

- [ ] Are there 10+ items? (Rule 1: Search/filter/sort)
- [ ] Creating new data? (Rule 2: Check duplicates)
- [ ] User can delete? (Rule 3: Confirmation + undo)
- [ ] Form in UI? (Rule 4: Clear structure, validation)
- [ ] Empty state possible? (Rule 5: Helpful message + CTA)
- [ ] Multi-select available? (Rule 6: Confirmation for bulk)
- [ ] Drag-drop interaction? (Rule 7: Feedback + visual)
- [ ] Modal/dialog used? (Rule 8: Close button, unsaved warning)
- [ ] Async operation? (Rule 9: Loading state spinner)
- [ ] Page/section change? (Rule 10: Nav highlight, breadcrumb)
- [ ] Multi-line text input? (Rule 11: Preserve newlines)
- [ ] Data that changes later? (Rule 12: Make editable)
- [ ] Create/move/status action? (Rule 13: Toast + highlight + undo)
