# Notification Channels Decision Guide

**Phase:** 2.3 (@Mentions & Notifications)  
**Decision Date:** June 9, 2026

---

## 📊 Option Analysis

### Option 1: Email (Recommended ✅)

**Pros:**
- ✅ Universal (works for all users)
- ✅ No additional setup required from users
- ✅ Professional & trustworthy
- ✅ Best for business communication
- ✅ Easy to implement with Resend/SendGrid
- ✅ Good audit trail & compliance
- ✅ Works on all devices

**Cons:**
- ❌ User might miss in spam folder
- ❌ Not instant (slight delay)
- ❌ Requires unsubscribe management

**Best For:** Formal team notifications, activity summaries

**Implementation:** 2-3 hours with Resend

---

### Option 2: LINE Messenger (Optional Add-on)

**Pros:**
- ✅ Instant delivery
- ✅ Very high read rates (messaging app)
- ✅ Popular in Thailand/Asia (your user base!)
- ✅ Can be richer interactions (buttons, cards)
- ✅ Direct messaging feels personal

**Cons:**
- ❌ Requires LINE Business account setup
- ❌ Users must link their LINE ID
- ❌ API complexity higher
- ❌ Limited free tier
- ❌ Overkill for most notifications

**Best For:** Urgent mentions, real-time alerts

**Implementation:** 4-5 hours + LINE setup

---

### Option 3: In-App Notifications Only

**Pros:**
- ✅ Simple to implement
- ✅ No external service needed
- ✅ Real-time within app

**Cons:**
- ❌ User won't know if they're not in the app
- ❌ Misses notifications when offline
- ❌ Not ideal for team collaboration

**Best For:** Not suitable for @mentions

---

## 🎯 Recommendation

### Phase 2.3 (July 1-5): Start with Email

**Primary Channel: Email**
- Set up Resend (15 min setup)
- Simple, professional, universal
- Covers 95% of notification needs
- Deploy by Friday

**Optional: Add LINE Later (Phase 3+)**
- Not urgent for MVP
- Can be added as "nice-to-have"
- User can opt-in for LINE notifications
- Separate project (not blocking Phase 2.3)

---

## 🛠️ Implementation Path

### Phase 2.3 (This Phase - 8.5 hours)
```
Email Notifications: 2 hours
├─ Resend API integration (0.5h)
├─ Email templates (0.5h)
├─ Send logic (0.5h)
└─ Testing (0.5h)
```

### Phase 3.0 (Next Phase - Optional)
```
LINE Notifications: 4 hours (optional add-on)
├─ LINE API setup (1h)
├─ User LINE ID linking (1h)
├─ Message sending logic (1h)
└─ Testing (1h)
```

---

## 📧 Email Service: Resend vs Others

### Quick Comparison

| Feature | Resend | SendGrid | Mailgun |
|---------|--------|----------|---------|
| **Free Tier** | 100/day | 100/day | 100/day |
| **Setup Time** | ⚡ 15 min | 30 min | 20 min |
| **React Support** | ✅ Excellent | ⚠️ Community | ❌ No |
| **Next.js Integration** | ✅ Native | ⚠️ Package | ⚠️ Package |
| **Dashboard** | ✅ Good | ✅ Great | ✅ Good |
| **Documentation** | ✅ Clear | ✅ Excellent | ✅ Good |
| **Deliverability** | ✅ 98%+ | ✅ 99%+ | ✅ 98%+ |

### Winner: **Resend** ⭐
- Fastest setup (15 minutes)
- Perfect for Next.js/React
- Clean API
- Modern dashboard
- Great for startups

---

## 📋 Setup Checklist for Phase 2.3

### Week 1 (Mon-Thu): Development
- [ ] Sign up for Resend account
- [ ] Get API key
- [ ] Create email template
- [ ] Implement mention detection
- [ ] Add email sending logic
- [ ] Database schema (mentions, notifications tables)

### Week 2 (Fri): Testing & Deploy
- [ ] Test email delivery (send 10 test emails)
- [ ] Verify email formatting (desktop + mobile)
- [ ] Check unsubscribe link
- [ ] Load test (simulate 100 mentions)
- [ ] Deploy to production
- [ ] Monitor email delivery rate (target: 98%+)

---

## 🚀 Configuration (Vercel)

### Environment Variables to Add
```env
# Resend
RESEND_API_KEY=re_xxxxx

# Email Configuration
NOTIFICATION_FROM_EMAIL=notifications@sx-crm.vercel.app
NOTIFICATION_FROM_NAME=SX-CRM Team

# Optional: LINE (Phase 3+)
# LINE_CHANNEL_ACCESS_TOKEN=...
# LINE_CHANNEL_SECRET=...
```

### Add to Vercel Settings
1. Go to Vercel Dashboard
2. Select sx-crm project
3. Settings → Environment Variables
4. Add above keys
5. Redeploy

---

## 📞 User Communication Plan

### Email Subject Line
```
@[Mentor]: You were mentioned in [Record Type] - [Record Name]
```

### Email Body Template
```
Hi [User Name],

[Mention Author] mentioned you in an activity:

📌 Activity: [Activity Title]
Record: [Lead/Job Name]
Context: "[... mention text ...]"

👉 View in SX-CRM: [Link]

---
You received this email because you were mentioned.
Update preferences: [Link to settings]
```

### LINE Message (Phase 3)
```
📌 You were mentioned by [Author]
Activity: [Title]
Record: [Name]

View: [Link]
```

---

## ✅ Success Criteria

By end of Phase 2.3 (July 5):
- [ ] Mention creation working
- [ ] Email delivery rate ≥ 98%
- [ ] Zero undeliverable emails
- [ ] Unsubscribe working correctly
- [ ] Mobile email rendering correct
- [ ] Notification UI complete
- [ ] Full test coverage
- [ ] Production deployed

---

## 🎯 Future Enhancements (Phase 3+)

1. **LINE Integration** — Add LINE as secondary channel
2. **Notification Digest** — Daily/weekly email summaries
3. **Smart Notifications** — Only notify for important mentions
4. **@team Mentions** — Mention entire team/department
5. **Notification Threading** — Group related mentions
6. **Read Receipts** — Know when user saw notification
7. **Notification Preferences UI** — In-app preference center

---

**Recommendation:** ✅ **Proceed with Email (Resend) for Phase 2.3**

Add LINE as optional enhancement in Phase 3+ if needed.

**Decision Made By:** Product Team  
**Approved:** June 9, 2026
