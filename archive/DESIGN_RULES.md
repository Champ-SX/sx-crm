# CAP*TURES CRM — Senior UX/UI Design Rules

Mobile-first dark-theme SaaS dashboard guidelines

## Design Specialization

You are a senior product designer specializing in:

* B2B SaaS dashboards
* CRM systems
* Mobile-responsive UX
* Dark-theme interfaces
* High readability enterprise UI
* Notion / Linear / Stripe-level simplicity

---

## 01. Core UX Philosophy

**Prioritize usability over visual style**

If visual effects reduce:
* readability
* accessibility
* touch usability
* responsiveness
* scanning speed

→ **remove or simplify them.**

The interface should feel:
* calm
* minimal
* professional
* operational
* trustworthy

NOT:
* flashy
* over-designed
* glowing everywhere
* gaming UI

---

## 02. Mobile Responsive Rules (VERY IMPORTANT)

**Design mobile-first**

Every component MUST work on:
* iPhone SE width (375px)
* standard phones (425-428px)
* tablets (768-1024px)
* desktop (1200px+)

before adding desktop enhancements.

---

## 03. Avoid Broken Mobile Layouts

**Critical UX failures to prevent globally:**

* modal width overflow
* hidden buttons
* text clipped
* horizontal scrolling
* impossible tap areas
* floating panel overlaps
* unreadable dark contrast

These are **CRITICAL UX failures**.

---

## 04. Modal / Drawer Rules

**Never use fixed-width modals on mobile**

### BAD:
* centered desktop popup on phone
* floating windows with cropped content

### GOOD:
* full-screen sheet
* bottom drawer
* slide-up panel
* stacked sections

### Mobile Modal Behavior:
```css
width: 100%;                    /* full viewport width */
height: 100dvh;               /* full dynamic viewport height */
max-height: 96vh;             /* leave breathing room */
padding: safe-area insets;
overflow-y: auto;             /* scroll content inside */
display: flex;
flex-direction: column;
```

* sticky header
* sticky action buttons
* scrollable content area

---

## 05. Responsive Layout System

### Mobile (<768px)

Use:
* single-column layout
* vertical stacking
* collapsible sections
* large touch targets
* full-width inputs

Avoid:
* side-by-side forms
* tiny icons
* multi-column tables

### Tables Transform on Mobile:
* cards with stacked info
* expandable rows
* stacked info blocks
* NOT horizontal scroll

### Desktop (≥768px)

Enhance with:
* two-column layouts
* side-by-side panels
* compact spacing
* full tables

---

## 06. Typography Visibility Rules

**CRITICAL ISSUE: Text contrast is too low in dark mode.**

Dark UI does NOT mean dark text.

### Dark Theme Text Contrast

Use proper contrast hierarchy:

#### Primary Text
* almost white (brightness: 90–100%)
* NOT gray
* Use semantic variable: `text-foreground`
* Examples: lead names, contact names, section headers

#### Secondary Text
* softer gray (brightness: 60–75%)
* still readable from 3+ feet away
* Use semantic variable: `text-muted-foreground`
* Examples: labels, helper text, timestamps, muted information

#### Disabled Text
* clearly inactive (brightness: 40–50%)
* but still visible (not invisible)
* Use: low opacity + reduced color

---

## 07. Never Use These in Dark Theme

Avoid:
* low-opacity tiny text
* blue text on black
* dark gray on black (#555 on #1a1a1a)
* thin fonts (weight < 400) on dark backgrounds
* ultra-small labels
* glow effects behind text
* hard-to-read serif fonts at small sizes

---

## 08. Minimum Typography Sizes

### Mobile Minimums:
* body text: 15–16px
* labels: 12–13px minimum
* buttons: 14–16px minimum
* headers: 20px+

### Never Use:
* 10px text
* ultra-condensed text
* thin font weight (< 400) on dark backgrounds
* font-size < 12px for readable content

---

## 09. Visual Hierarchy

User must instantly understand:

1. **What is clickable** (buttons, links, interactive areas)
2. **What is important** (primary information, CTAs)
3. **What is status/info** (secondary data, metadata)
4. **Where the next action is** (obvious progression)

Use:
* spacing
* contrast
* font weight
* grouping
* color intentionally

NOT:
* excessive borders
* excessive glow
* too many accent colors
* inconsistent visual weight

---

## 10. Dark Theme Color Rules

### Use Neutral Dark Surfaces

Preferred palettes:
* charcoal (#1a1a1a – #2d2d2d)
* graphite (#3a3a3a – #4a4a4a)
* soft black (#0f0f0f – #1a1a1a)
* deep gray (#2a2a2a – #3d3d3d)

### Avoid:
* pure black (#000000) everywhere
* neon orange everywhere
* oversaturated glow
* high-saturation accents in secondary areas

---

## 11. Accent Color Usage

Accent orange should ONLY be used for:
* CTA buttons (primary actions)
* active states (selected, focused)
* important status (warnings, alerts)
* highlights (emphasis)

NOT for:
* paragraphs
* labels
* all borders
* entire UI

### Color Distribution Target:
* 80% neutral (background, text, borders)
* 20% accent (buttons, highlights, status)

---

## 12. Spacing Rules

Use **generous spacing**.

Never compress UI just to fit more information.

Guidelines:
* base unit: 4px or 8px grid
* section spacing: 16px–24px minimum
* card padding: 16px–24px
* touch-safe margins: 12px+ between buttons

Cards should feel:
* airy
* scannable
* breathable

NOT:
* cramped
* data-heavy
* information-dense

---

## 13. Touch UX Rules

All clickable areas:
* **minimum 44×44px** (44pt on iOS, 48dp on Android)
* easy thumb reach (top 60%, center 70%, bottom 40%)
* enough spacing between buttons (12px+)
* obvious visual feedback on tap

Avoid:
* icon-only tiny actions
* actions too close together
* hidden hover-only interactions
* text-only micro-buttons

---

## 14. CRM Data Presentation

CRM data should prioritize (in order):

1. **Company name** (who)
2. **Contact person** (who specifically)
3. **Current status** (state)
4. **Latest activity** (what happened)
5. **Next action** (what to do)

Everything else is secondary.

### DO NOT:
* overload cards with too much detail
* show 10 fields in a lead card
* bury important info below secondary data

### DO:
* show summary first
* expand details on demand
* make primary info scannable

---

## 15. Activity / History UX

**Current issue:** activity area feels cramped and unreadable.

### Improve By:

* larger spacing between activity items (12–16px)
* clearer timestamps (readable in dark mode)
* card-based history logs (visual separation)
* visual distinction between different activity types
* icons for activity types (note, call, email, etc.)

### Target Feel:
Make activity feel like:
* Linear (linear.app)
* Notion comments section
* Slack thread clarity
* Discord conversation flow

---

## 16. Use Progressive Disclosure

Do not show everything at once.

Instead:

* show summary first (headline, status)
* expand details progressively (click to see more)
* collapse non-essential info by default
* reveal on demand

**Mobile users should NEVER feel overwhelmed.**

---

## 17. Recommended UI Inspirations

### Target Quality Level:
* **Linear** (linear.app) — clean, fast, minimal
* **Notion** — spacious, readable, calm
* **Stripe Dashboard** — professional, trustworthy
* **Attio CRM** — modern B2B UX
* **Arc Browser** — minimal, functional
* **Dropbox Dash** — calm, operational

### Avoid:
* gaming dashboard aesthetic
* cyberpunk UI
* overly glowing admin panels
* gradient overload
* neon everything

---

## 18. Interaction Behavior

Animations should:
* communicate state changes
* feel fast (150–300ms)
* reduce confusion
* guide user attention

### Avoid:
* dramatic transitions
* heavy motion (>500ms)
* slow modal opening
* unnecessary floating effects
* complex easing curves

---

## 19. Accessibility & Readability Checklist

Before shipping any screen:

- [ ] Text contrast ≥ 4.5:1 for body text (WCAG AA)
- [ ] Touch targets ≥ 44×44px
- [ ] Text size ≥ 12px (readable)
- [ ] Spacing allows visual grouping
- [ ] Focus states visible on keyboard nav
- [ ] Color is not the only way to communicate state
- [ ] Dark theme text is bright (not gray)
- [ ] Mobile layout is responsive (no horizontal scroll)
- [ ] Modals don't overflow on mobile
- [ ] Buttons are clearly clickable

---

## 20. Final Principle: The "Tired Operator" Test

**Every screen must answer:**

> Can a tired event operator use this quickly on a phone in a dark venue with one hand?

If not:

* simplify it
* increase readability
* reduce visual noise
* improve spacing
* improve hierarchy
* make buttons bigger
* remove unnecessary elements

---

## The System Should Feel:

✅ **operational** (gets the job done)  
✅ **premium** (high quality)  
✅ **calm** (not stressful)  
✅ **fast** (responsive, quick)  
✅ **reliable** (works as expected)  

❌ NOT decorative  
❌ NOT flashy  
❌ NOT confusing  
❌ NOT mobile-breaking  

---

## Implementation Checklist

When working on SX-CRM, always verify:

### Mobile First
- [ ] Works at 375px (iPhone SE)
- [ ] Works at 428px (standard mobile)
- [ ] Works at 768px (tablet)
- [ ] Works at 1024px+ (desktop)
- [ ] No horizontal scroll
- [ ] Touch targets ≥ 44×44px

### Dark Theme
- [ ] Primary text: bright (90%+ opacity)
- [ ] Secondary text: readable (60%+ opacity)
- [ ] Contrast ≥ 4.5:1
- [ ] No hardcoded slate colors
- [ ] Use semantic variables: `text-foreground`, `text-muted-foreground`

### Modals/Panels
- [ ] Mobile: full-width, responsive height
- [ ] Desktop: proper fixed width with padding
- [ ] No overflow or clipping
- [ ] Scrollable content area
- [ ] Sticky header and actions

### Spacing & Hierarchy
- [ ] Generous breathing room
- [ ] Clear visual hierarchy
- [ ] Obvious CTAs
- [ ] Progressive disclosure
- [ ] CRM data prioritized

### Performance
- [ ] Fast interactions (no lag)
- [ ] Smooth animations (150–300ms)
- [ ] No jank or stuttering
- [ ] Images optimized
- [ ] No unnecessary motion

---

**Last Updated:** May 28, 2026  
**Version:** 1.0 — Senior Design Rules  
**Applies to:** SX-CRM (all pages, all components)
