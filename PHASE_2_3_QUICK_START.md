# Phase 2.3 Quick Start Guide: @Mentions & Email Notifications

**Timeline:** July 1-5, 2026 (8.5 hours)  
**Deliverable:** @mentions + Email notifications via Resend

---

## 🚀 30-Second Overview

**What:** Users mention team members with `@name` in notes → they get emailed  
**Why:** Better team communication & accountability  
**How:** Resend email service + mention detection + DB tracking

---

## 📅 5-Day Sprint Breakdown

### Monday 7/1: Database & Backend Setup (2.5 hours)

**1. Create Database Tables** (30 min)
```sql
-- migrations/20260701_create_mentions_notifications.sql

CREATE TABLE public.mentions (
  mention_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(activity_id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_by_user_id UUID NOT NULL,
  mentioned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  mention_id UUID REFERENCES mentions(mention_id) ON DELETE CASCADE,
  channel VARCHAR(50) DEFAULT 'email',
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.email_logs (
  email_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(notification_id),
  recipient_email VARCHAR(255),
  status VARCHAR(50),
  sent_at TIMESTAMP
);

ALTER TABLE public.users ADD COLUMN notification_channel VARCHAR(50) DEFAULT 'email';
ALTER TABLE public.users ADD COLUMN line_user_id VARCHAR(255);
```

**2. Set up Resend Account** (30 min)
```bash
# 1. Go to https://resend.com (sign up)
# 2. Verify your email
# 3. Get API key from dashboard
# 4. Add to Vercel: RESEND_API_KEY=re_xxxxx
```

**3. Create Email Service** (1.5 hours)
```typescript
// lib/email-service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMentionNotification(
  mentionedUserEmail: string,
  mentionedUserName: string,
  mentionAuthor: string,
  activityTitle: string,
  recordName: string,
  mentionText: string,
  recordLink: string
) {
  const html = `
    <h2>@${mentionedUserName}, you were mentioned!</h2>
    <p><strong>By:</strong> ${mentionAuthor}</p>
    <p><strong>Activity:</strong> ${activityTitle}</p>
    <p><strong>Record:</strong> ${recordName}</p>
    <blockquote>${mentionText}</blockquote>
    <p><a href="${recordLink}">View in SX-CRM →</a></p>
  `;

  return await resend.emails.send({
    from: process.env.NOTIFICATION_FROM_EMAIL || 'notifications@sx-crm.vercel.app',
    to: mentionedUserEmail,
    subject: `@${mentionedUserName}: You were mentioned in ${recordName}`,
    html,
  });
}
```

---

### Tuesday 7/2: Mention Detection Logic (2 hours)

**1. Create Mention Parser** (1 hour)
```typescript
// lib/mention-parser.ts
import { supabase } from '@/lib/supabase/client';

interface Mention {
  username: string;
  userId: string;
  email: string;
  role: string;
}

export async function detectMentions(text: string): Promise<Mention[]> {
  // Find all @mentions in text
  const mentionRegex = /@(\w+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  
  if (matches.length === 0) return [];

  const usernames = matches.map(m => m[1]);
  
  // Get user info from database
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .in('full_name', usernames);

  return users || [];
}

export function extractMentionedUserIds(text: string, detectedMentions: Mention[]): string[] {
  return detectedMentions.map(m => m.userId);
}
```

**2. Integrate with Activity Creation** (1 hour)
```typescript
// store/crm-store.ts - Update addActivity function

async function addActivity(activity: Activity) {
  // ... existing code ...
  
  // NEW: Detect mentions
  const mentions = await detectMentions(activity.description);
  
  for (const mention of mentions) {
    // Create mention record
    await supabase
      .from('mentions')
      .insert({
        activity_id: activity.activity_id,
        mentioned_user_id: mention.userId,
        mentioned_by_user_id: currentUser.id,
      });

    // Create notification
    const { data: notif } = await supabase
      .from('notifications')
      .insert({
        user_id: mention.userId,
        mention_id: mention.mention_id,
        channel: 'email',
      })
      .select('notification_id')
      .single();

    // Send email (async, don't wait)
    if (notif?.notification_id) {
      sendMentionEmail(mention, activity, notif.notification_id);
    }
  }
}
```

---

### Wednesday 7/3: Frontend UI (2 hours)

**1. Add Mention Dropdown** (1 hour)
```tsx
// components/mention-dropdown.tsx
'use client'

import { useState, useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'

export function MentionDropdown({ onSelect }: { onSelect: (name: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mentionChar, setMentionChar] = useState('')
  const { users } = useCRMStore()

  const filtered = mentionChar 
    ? users.filter(u => u.full_name.toLowerCase().includes(mentionChar))
    : users

  return (
    <div className="absolute bg-white border rounded shadow-lg z-50">
      {filtered.map(user => (
        <button
          key={user.id}
          onClick={() => {
            onSelect(`@${user.full_name}`)
            setIsOpen(false)
          }}
          className="w-full text-left px-3 py-2 hover:bg-blue-50"
        >
          <div className="font-medium">{user.full_name}</div>
          <div className="text-xs text-gray-500">{user.role}</div>
        </button>
      ))}
    </div>
  )
}
```

**2. Update Textarea Components** (1 hour)
- Add mention dropdown to notes textarea
- Handle @ character detection
- Insert selected user name
- Style mentions as blue links in display

---

### Thursday 7/4: Testing & Polish (2 hours)

**1. Test Mentions** (45 min)
```typescript
// Test cases
test('Detect single mention', () => {
  const text = 'Hey @john, check this'
  const mentions = detectMentions(text)
  expect(mentions).toHaveLength(1)
})

test('Detect multiple mentions', () => {
  const text = '@alice @bob please review'
  const mentions = detectMentions(text)
  expect(mentions).toHaveLength(2)
})

test('Ignore duplicate mentions', () => {
  const text = '@john and @john'
  // Should only create one notification
})
```

**2. Test Email Delivery** (45 min)
- Send 5 test emails to yourself
- Verify formatting on desktop
- Verify formatting on mobile
- Check link validity
- Test unsubscribe link

**3. QA Checklist**
- [ ] Mention dropdown appears when typing @
- [ ] Multiple users can be mentioned in one note
- [ ] Email sent within 30 seconds
- [ ] Email has correct name and context
- [ ] Link in email goes to correct record
- [ ] No duplicate emails sent
- [ ] Already-mentioned users don't appear twice in dropdown

---

### Friday 7/5: Deploy & Monitor (2 hours)

**1. Final Checks** (30 min)
```bash
# Build test
npm run build

# Check no errors
echo "Build status: $?"

# Verify env vars in Vercel
echo "RESEND_API_KEY should be set"
```

**2. Deploy to Production** (30 min)
```bash
git add -A
git commit -m "feat: Add @mentions and email notifications (Phase 2.3)"
git push origin main
# Vercel auto-deploys
```

**3. Monitor (1 hour)**
- [ ] Deployment successful
- [ ] Create test mention
- [ ] Verify email received
- [ ] Check email_logs table
- [ ] Monitor for errors in Vercel logs
- [ ] Check Resend dashboard for bounce/failures

---

## 📦 Files to Create/Modify

### New Files
```
lib/email-service.ts          # Resend integration
lib/mention-parser.ts         # Mention detection
components/mention-dropdown.tsx
migrations/20260701_mentions.sql
```

### Modify
```
store/crm-store.ts            # Add mention detection to addActivity
app/leads-opportunities/page.tsx    # Add mention UI to notes
app/won-ready-op/page.tsx           # Add mention UI to job notes
```

---

## 🔑 Environment Variables (Vercel)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
NOTIFICATION_FROM_EMAIL=notifications@sx-crm.vercel.app
NOTIFICATION_FROM_NAME=SX-CRM Team
```

---

## 💡 Pro Tips

1. **Start with Email Detection First** — Get mention parsing working before email
2. **Use Unique Constraints** — Prevent duplicate mention notifications
3. **Test with Multiple Users** — Have 2+ people in the system to test mentions
4. **Monitor Email Delivery** — Check Resend dashboard daily for first week
5. **Add Logging** — Log all mention detection and email sends for debugging

---

## ⚠️ Common Pitfalls

- ❌ Forgetting to check user exists before mentioning
- ❌ Creating multiple notifications for same mention
- ❌ Not handling special characters in usernames
- ❌ Email template not mobile-responsive
- ❌ Forgetting RESEND_API_KEY in Vercel env

---

## 🎯 Success = Friday 5PM

✅ Users can mention team members  
✅ Emails sent and received  
✅ No console errors  
✅ Deployed to production  
✅ Monitoring in place

**Celebrate! 🎉**

---

**Questions?** See PHASE_2_3_MENTIONS_NOTIFICATIONS.md for full spec  
**Decision Guide:** See NOTIFICATION_CHANNELS_DECISION.md
