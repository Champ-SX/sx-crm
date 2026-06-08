# Phase 2.3: @Mentions & User Notifications (July 1-5, 2026)

**Duration:** 8.5 hours | **Deployment:** Friday, July 5, 2026  
**Status:** 📋 Planned (after Phase 2.2)

---

## 🎯 Feature Overview

Users can mention team members using `@username` in notes and activities. Mentioned users receive notifications via **email (primary) or LINE messenger (optional)** depending on their preference.

### Key Requirements
- ✅ Google Auth integration (from Phase 2.0)
- ✅ Role-based dashboards (from Phase 2.1)
- ✅ Mobile UI tabs (from Phase 2.2)

---

## 📋 Features Specification

### 1. @Mention System

#### How It Works
1. User types `@` in any note/activity text field
2. App shows dropdown list of team members (with their roles)
3. Click or select to mention them: `@username`
4. Mentioned user receives notification

#### Database Schema Changes
```sql
-- New table: mentions
CREATE TABLE mentions (
  mention_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(activity_id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES users(id) NOT NULL,
  mentioned_by_user_id UUID REFERENCES users(id) NOT NULL,
  mentioned_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(activity_id, mentioned_user_id)
);

-- Index for quick lookups
CREATE INDEX idx_mentions_user ON mentions(mentioned_user_id, read_at);
CREATE INDEX idx_mentions_activity ON mentions(activity_id);
```

#### UI Implementation
- **Leads Page**: Add `@mention` trigger in notes editor
- **Won Page**: Add `@mention` trigger in job notes
- **Modal**: Show dropdown with filtered user list
- **Highlight**: Style mentions in text as `@user` (blue, clickable)

**Textarea Enhancement:**
```tsx
<Textarea 
  placeholder="Type @ to mention a team member..."
  onKeyDown={(e) => handleMention(e)}
/>
```

---

### 2. Notification System

#### Notification Channels
**Primary Option: Email** (Recommended)
- Service: Resend, SendGrid, or Mailgun
- Trigger: When user is mentioned
- Content: Activity summary + link to record + mention context

**Alternative: LINE Messenger** (Optional)
- Service: LINE Messaging API
- Trigger: Same as email
- Content: Activity summary + link to record
- Note: Requires LINE Business account and user LINE ID linking

#### Notification Content
```
📌 You were mentioned by [Mention Author]

Activity: [Activity Title]
Note: "...@[YourName]..."
Record: [Lead/Job Name]

👉 View: https://sx-crm.vercel.app/leads-opportunities?id=...

---
Your Preference: Email | LINE | None
```

#### Database Schema
```sql
-- New table: notifications
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  mention_id UUID REFERENCES mentions(mention_id) ON DELETE CASCADE,
  notification_type VARCHAR(50) DEFAULT 'mention', -- 'mention', 'activity', etc.
  channel VARCHAR(50), -- 'email', 'line', 'in_app'
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- New table: email_logs (audit trail)
CREATE TABLE email_logs (
  email_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(notification_id),
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(50), -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences
ALTER TABLE users ADD COLUMN notification_channel VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN line_user_id VARCHAR(255); -- Optional
ALTER TABLE users ADD COLUMN notification_enabled BOOLEAN DEFAULT TRUE;
```

#### RLS Policies
```sql
-- Users can only read their own notifications
CREATE POLICY notifications_own ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Only system can insert notifications
CREATE POLICY notifications_system_insert ON notifications
  FOR INSERT WITH CHECK (false);
```

---

## 🛠️ Implementation Plan

### Task Breakdown (8.5 hours)

| Task | Hours | Owner | Status |
|------|-------|-------|--------|
| **1. Database Schema** | 1h | Backend | 📋 Pending |
| Create mentions table | 0.5h | | |
| Create notifications table | 0.5h | | |
| Create email_logs table | | (included) | |
| **2. Backend Setup** | 2h | Backend | 📋 Pending |
| Email service integration | 1h | | |
| Mention detection logic | 0.5h | | |
| Notification trigger system | 0.5h | | |
| **3. Frontend UI** | 2.5h | Frontend | 📋 Pending |
| @mention dropdown component | 1h | | |
| Activity text parsing | 0.5h | | |
| Notification center UI | 1h | | |
| **4. Testing & Deploy** | 2h | QA/DevOps | 📋 Pending |
| Unit tests (mentions) | 0.5h | | |
| Integration tests (email) | 0.5h | | |
| E2E testing (full flow) | 0.5h | | |
| Deploy & monitor | 0.5h | | |
| **5. Documentation** | 1h | PM/Dev | 📋 Pending |
| User guide | 0.5h | | |
| Admin setup (email service) | 0.5h | | |

---

## 📧 Email Service Decision

### Options Comparison

| Service | Cost | Features | Setup Time | Best For |
|---------|------|----------|-----------|----------|
| **Resend** | Free tier | Transactional, React templates | 15 min | Modern, quick setup |
| **SendGrid** | Free tier (100/day) | Powerful, webhooks, stats | 30 min | Large volume |
| **Mailgun** | Free tier | Flexible, good docs | 20 min | Developers |
| **Postmark** | Paid | Premium support, high delivery | 30 min | Enterprise |

**Recommended: Resend**
- Easy Next.js integration
- Free tier sufficient for Phase 2
- React email templates
- Fast setup

---

## 💬 LINE Messenger Integration (Optional)

If using LINE for notifications:

```ts
// Example: Send LINE notification
const lineClient = new LineBotSDK({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

await lineClient.pushMessage(userLineId, {
  type: 'text',
  text: `📌 @${userName} mentioned you in ${recordName}\n\n${notePreview}`,
});
```

**Setup Required:**
1. LINE Business account
2. Messaging API channel
3. User LINE ID collection (optional profile field)
4. Webhook for message delivery confirmations

---

## ✅ Acceptance Criteria

### Mentions
- [ ] User types `@` in activity/note field
- [ ] Dropdown shows all team members (name + role)
- [ ] Selecting mention adds `@username` to text
- [ ] Mention is stored in database with activity
- [ ] Mentioned user marked in activity record

### Notifications
- [ ] Email sent within 30 seconds of mention
- [ ] Email includes mention context and link
- [ ] User receives ONE email per mention (no duplicates)
- [ ] Notification marked as read when viewed
- [ ] User can disable notifications in preferences

### Email Service
- [ ] Email deliverability: >95%
- [ ] Failed emails logged with reason
- [ ] Bounced emails trigger user notification
- [ ] Resend/SendGrid webhook configured

### UI/UX
- [ ] Mention suggestions show on `@` character
- [ ] Suggestions update as user types
- [ ] Already-mentioned users don't appear twice
- [ ] Mentions render as blue links in display view

---

## 🔐 Security & Privacy

### Data Protection
```sql
-- RLS: Only users can see their own mentions/notifications
CREATE POLICY mentions_privacy ON mentions
  FOR SELECT USING (
    mentioned_user_id = auth.uid() OR
    mentioned_by_user_id = auth.uid()
  );
```

### Email Best Practices
- ✅ All emails signed (DKIM, SPF)
- ✅ Unsubscribe link in footer
- ✅ No sensitive data in preview
- ✅ User preference respected
- ✅ Audit trail (email_logs table)

---

## 📱 Mobile Considerations

**Mobile UI:**
- Mention dropdown positioned above keyboard
- Scrollable user list
- Quick select from frequent users
- Notification badge on activity tab

---

## 🚀 Deployment Checklist

### Before Launch
- [ ] Email service credentials configured (Vercel env vars)
- [ ] Database migrations applied to production
- [ ] Mention parsing tested with special characters (Thai, emoji)
- [ ] Email templates reviewed for mobile
- [ ] Unsubscribe link working
- [ ] RLS policies enabled

### Post-Launch Monitoring (2 hours)
- [ ] Email delivery rate >95%
- [ ] No email bounces
- [ ] Mention detection working correctly
- [ ] Notification UI rendering properly
- [ ] Performance metrics normal (DB queries <100ms)

---

## 📊 Success Metrics

### Phase 2.3 KPIs
- Mention creation rate
- Email delivery rate (target: 98%+)
- User notification preference choices
- Time to implement: 8.5 hours (actual vs. planned)

---

## 🎯 Follow-up Phases

**Phase 3.0 (Proposed):**
- Advanced mention history/search
- Notification digest (daily summary)
- Smart notification frequency (reduce spam)
- Mention threading/replies
- @team mentions (mention whole team)

---

**Approval:** Waiting for confirmation  
**Last Updated:** June 9, 2026  
**Target Deploy:** Friday, July 5, 2026
