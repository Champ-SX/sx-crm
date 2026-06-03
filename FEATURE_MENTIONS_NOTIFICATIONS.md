# Feature: @Mentions & Email Notifications

**Status:** New Feature (to be added to Phase 2)  
**Priority:** High - Improves team collaboration  
**Timeline:** Can be integrated into Phase 2.4 or as Phase 2.5

---

## 🎯 Feature Overview

Users can @mention other team members in:
- Customer/Lead notes
- Job/Opportunity comments
- Activity updates

When mentioned, the user receives:
- ✅ In-app notification (bell icon)
- ✅ Email notification to their Google email
- ✅ Optional Slack notification (future)

---

## 📋 Technical Requirements

### 1. Database Schema

```sql
-- Mentions table
CREATE TABLE public.mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentioned_by_user_id UUID REFERENCES public.users(id),
  mentioned_user_id UUID REFERENCES public.users(id),
  
  -- Context (where the mention happened)
  entity_type TEXT CHECK (entity_type IN ('customer', 'lead', 'job', 'activity')),
  entity_id UUID,
  comment_id UUID,
  
  content TEXT, -- The mention message/note
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table (general)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  type TEXT CHECK (type IN ('mention', 'comment', 'assignment', 'status_change')),
  
  title TEXT,
  message TEXT,
  
  related_entity_type TEXT, -- 'customer', 'lead', 'job'
  related_entity_id UUID,
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email logs (for audit trail)
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  email_address TEXT,
  
  subject TEXT,
  body TEXT,
  
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_mentions_user ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_read ON public.mentions(mentioned_user_id, read);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_email_logs_user ON public.email_logs(user_id);
```

---

## 💻 Implementation Steps

### Phase 1: Mention Input & Detection

**File:** Create `components/shared/mention-input.tsx`

```tsx
// Mention-aware textarea component
export function MentionInput({ 
  value, 
  onChange, 
  placeholder,
  availableUsers 
}) {
  // Features:
  // - Detect @mentions as user types
  // - Show dropdown of available users when @ is typed
  // - Replace @username with link to user
  // - Extract mentioned user IDs from input
  
  return (
    <textarea 
      value={value}
      onChange={handleChange}
      onKeyDown={handleMentionTrigger}
      placeholder={placeholder}
    />
  )
}
```

**Files to Update:**
- `app/customers/page.tsx` (notes field)
- `app/leads-opportunities/page.tsx` (notes field)
- Activity/comment sections throughout app

---

### Phase 2: Notification System

**File:** Create `components/shared/notifications-bell.tsx`

```tsx
// Notifications bell in header/navigation
export function NotificationsBell() {
  // Shows:
  // - Red dot if unread notifications
  // - Dropdown with recent mentions
  // - "View all" link
  
  return (
    <button className="relative">
      <BellIcon />
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
      <DropdownPanel>
        {notifications.map(n => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </DropdownPanel>
    </button>
  )
}
```

**Files to Update:**
- `app/layout.tsx` (add bell to navigation)

---

### Phase 3: Email Notification Service

**File:** Create `utils/email-service.ts`

```ts
import nodemailer from 'nodemailer'
import { supabase } from './supabase/client'

export async function sendMentionEmail(
  mentionedUser: User,
  mentionedByUser: User,
  entityType: string,
  entityTitle: string,
  message: string,
  entityLink: string
) {
  const emailTemplate = `
    <h2>${mentionedByUser.name} mentioned you</h2>
    <p>${message}</p>
    <p>View in SX CRM: <a href="${entityLink}">${entityTitle}</a></p>
  `
  
  try {
    await sendEmail({
      to: mentionedUser.email,
      subject: `${mentionedByUser.name} mentioned you in SX CRM`,
      html: emailTemplate
    })
    
    // Log email sent
    await supabase
      .from('email_logs')
      .insert({
        user_id: mentionedUser.id,
        email_address: mentionedUser.email,
        subject: `${mentionedByUser.name} mentioned you`,
        body: emailTemplate,
        status: 'sent'
      })
  } catch (error) {
    console.error('Failed to send mention email:', error)
    // Log failure
  }
}
```

**Email Provider Options:**
- SendGrid (recommended)
- Mailgun
- Amazon SES
- Resend.com (simpler)

---

### Phase 4: Store Integration

**File:** Update `store/crm-store.ts`

```ts
interface CRMStore {
  // Existing...
  
  // New mention functions
  mentionUser: (userId: string, entityType: string, entityId: string, message: string) => Promise<void>
  getNotifications: (userId: string) => Promise<Notification[]>
  markNotificationAsRead: (notificationId: string) => Promise<void>
  searchMentionableUsers: (query: string) => User[]
  
  notifications: Notification[]
  unreadNotificationCount: number
}
```

---

## 🎯 User Workflow

### Mentioning Someone:

```
1. User types @ in notes field
   ↓
2. Dropdown appears with team members
   ↓
3. User clicks on name (or continues typing)
   ↓
4. Name replaced with @John format
   ↓
5. On save:
   - Detect mentioned user IDs
   - Create mention records in DB
   - Send email notification
   - Create in-app notification
```

### Receiving a Mention:

```
1. John sees bell icon with red dot
   ↓
2. Clicks bell to view mentions
   ↓
3. Sees "Sarah mentioned you in Customer XYZ"
   ↓
4. Clicks to navigate to that customer
   ↓
5. John's email receives notification:
   "Sarah mentioned you in SX CRM"
```

---

## 📊 Integration Points

### Where Mentions Can Happen:

1. **Customer Notes** (`app/customers/page.tsx`)
   - In DetailView notes section
   - Accessible to all users with customer access

2. **Lead/Opportunity Notes** (`app/leads-opportunities/page.tsx`)
   - In DetailView notes section
   - Accessible to sales team

3. **Job/Activity Comments** (Future)
   - Activity timeline comments
   - Job-specific notes

4. **Messages/Chat** (Phase 2.6+)
   - Dedicated messaging system
   - Future feature

---

## 🔐 Security & Privacy

**RLS Policies:**
```sql
-- Users can only see mentions directed to them
CREATE POLICY "Users see own mentions"
  ON public.mentions FOR SELECT
  USING (mentioned_user_id = auth.uid());

-- Users can create mentions for others
CREATE POLICY "Users can create mentions"
  ON public.mentions FOR INSERT
  WITH CHECK (mentioned_by_user_id = auth.uid());
```

**Email Privacy:**
- Only send to verified email addresses
- Don't expose other users' emails publicly
- Log all email sends for audit
- Unsubscribe option (future)

---

## 📧 Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #3b82f6; color: white; padding: 20px; }
    .content { padding: 20px; }
    .mention-text { background: #f0f4f8; padding: 15px; border-left: 4px solid #3b82f6; }
    .cta-button { 
      background: #3b82f6; 
      color: white; 
      padding: 10px 20px; 
      text-decoration: none; 
      border-radius: 5px; 
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 You were mentioned in SX CRM</h1>
    </div>
    
    <div class="content">
      <p>Hi {{ mentionedUser.name }},</p>
      
      <p><strong>{{ mentioningUser.name }}</strong> mentioned you:</p>
      
      <div class="mention-text">
        {{ mentionMessage }}
      </div>
      
      <p>
        <strong>Context:</strong> {{ entityType }} - {{ entityTitle }}
      </p>
      
      <p>
        <a href="{{ viewLink }}" class="cta-button">View in SX CRM</a>
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p style="color: #666; font-size: 12px;">
        You received this email because you were mentioned in SX CRM. 
        To manage notifications, log in to your account.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 🗂️ Files to Create/Modify

### Create (NEW):
```
components/shared/
├── mention-input.tsx
├── notifications-bell.tsx
└── mention-dropdown.tsx

utils/
├── email-service.ts
├── mention-parser.ts
└── notification-service.ts

app/notifications/
└── page.tsx (view all notifications)
```

### Modify (EXISTING):
```
app/layout.tsx (add notifications bell)
app/customers/page.tsx (add mention input to notes)
app/leads-opportunities/page.tsx (add mention input to notes)
store/crm-store.ts (add mention & notification functions)
.env.local (add email service credentials)
```

---

## ⏱️ Timeline & Effort

**Phase 2.4 (or new Phase 2.5):**

| Task | Hours | Status |
|------|-------|--------|
| Database schema & migrations | 1h | 🔧 |
| Mention input component | 2h | 🔧 |
| Notifications bell | 1.5h | 🔧 |
| Email service integration | 1.5h | 🔧 |
| Store integration | 1h | 🔧 |
| Testing & polish | 1.5h | 🔧 |
| **TOTAL** | **8.5 hours** | |

**Deployment:** Friday after Phase 2.3 completes

---

## ✅ Success Criteria

- [x] Users can @mention team members in notes
- [x] Mentioned user receives in-app notification
- [x] Mentioned user receives email notification
- [x] Email contains mention context and link
- [x] Notifications bell shows unread count
- [x] Clicking notification navigates to source
- [x] Email logs tracked for audit
- [x] Mobile responsive notification UI
- [x] Zero console errors
- [x] RLS policies properly restrict access

---

## 🔄 Where This Fits in Phase 2

```
Week 1: Auth & Authorization        (Phase 2.0)
Week 2: Role-Based Dashboards       (Phase 2.1)
Week 3: Mobile Tabs                 (Phase 2.2)
Week 4: Search & Analytics          (Phase 2.3)
       OPTIONAL: Mentions & Notifications (Phase 2.4/2.5)
```

**Status:** Ready to add to roadmap
**Priority:** High (improves team communication)
**Dependency:** Phase 2.0 (needs user authentication)

---

**Last Updated:** June 3, 2026  
**Status:** Specification Complete  
**Ready for:** Phase 2 roadmap integration

