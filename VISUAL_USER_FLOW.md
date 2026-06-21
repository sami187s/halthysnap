# 🎯 Search & Scan Limits - Visual User Flow

## 📱 Screen States

### 1️⃣ **SearchScreen - Initial State (Free User)**
```
┌─────────────────────────────────┐
│  ←  Search Products        ℹ️   │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ ✨ 2 premium searches     │  │
│  │    left today              │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌─────────────────────────┐    │
│  │ 🔍 Search...            │    │
│  └─────────────────────────┘    │
│  [      Search      ]            │
│                                  │
│  Search Tips:                    │
│  • Try "yogurt", "shampoo"...    │
│                                  │
└─────────────────────────────────┘
```

### 2️⃣ **After First Search (1 Left)**
```
┌─────────────────────────────────┐
│  ←  Search Products        ℹ️   │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ ✨ 1 premium search       │  │
│  │    left today              │  │
│  └───────────────────────────┘  │
│                                  │
│  [Results with AI ✅]            │
│  • Full analysis                 │
│  • AI recommendations            │
│  • Chatbot available             │
│                                  │
└─────────────────────────────────┘
```

### 3️⃣ **After Second Search (Popup Appears)**
```
┌─────────────────────────────────┐
│  [Results with AI ✅]            │
│                                  │
│  ┌─────────────────────────┐    │
│  │ 🎯 Premium Searches     │    │
│  │    Complete!            │    │
│  │                         │    │
│  │ You've used your 2      │    │
│  │ premium searches!       │    │
│  │                         │    │
│  │ You can still search    │    │
│  │ for free (no AI), or    │    │
│  │ upgrade for unlimited.  │    │
│  │                         │    │
│  │ [Continue Free] [Upgrade]│   │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### 4️⃣ **After Limit (Free Mode)**
```
┌─────────────────────────────────┐
│  ←  Search Products        ℹ️   │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ 🔒 Free search only       │  │
│  │    (no AI)                │  │
│  └───────────────────────────┘  │
│                                  │
│  [Results WITHOUT AI ℹ️]         │
│  • Basic health score ✅         │
│  • Ingredient list ✅            │
│  • No AI analysis ❌             │
│  • No chatbot ❌                 │
│                                  │
└─────────────────────────────────┘
```

### 5️⃣ **Premium User (No Limits)**
```
┌─────────────────────────────────┐
│  ←  Search Products        ℹ️   │
├─────────────────────────────────┤
│  (No badge - unlimited)          │
│                                  │
│  [Results with AI ✅]            │
│  • Unlimited searches            │
│  • Full AI analysis              │
│  • All features always           │
│  • No popups ever                │
│                                  │
└─────────────────────────────────┘
```

## 🔄 Complete User Journey

### Free User - Day 1

```
📅 DAY 1 - Morning

Start: 2 scans + 2 searches available
├─ Search #1 "Dove Shampoo"
│  ├─ ✅ Premium results with AI
│  ├─ Badge: "1 premium search left"
│  └─ No popup
│
├─ Scan #1 (Barcode)
│  ├─ ✅ Premium results with AI
│  ├─ Status: "1 premium scan left"
│  └─ No popup
│
├─ Search #2 "Coca Cola"
│  ├─ ✅ Premium results with AI
│  ├─ Badge: "Free search only (no AI)"
│  └─ 🎯 POPUP: "Premium Searches Complete!"
│     ├─ [Continue Free] ← Stays in app
│     └─ [Upgrade Now] ← Goes to subscription
│
├─ Search #3 "Yogurt"
│  ├─ ℹ️ Free results (no AI)
│  ├─ Basic score + ingredients only
│  └─ No popup (already shown)
│
└─ Scan #2 (Barcode)
   ├─ ✅ Premium results with AI
   ├─ Status: "Free scan only (no AI)"
   └─ 🎯 POPUP: "Premium Scans Complete!"

📅 DAY 2 - After Midnight Reset

Start: 2 scans + 2 searches available again
└─ Fresh counters! Same flow repeats.
```

## 📊 Feature Matrix

| Feature | Premium User | Free (1-2 uses) | Free (After limit) |
|---------|--------------|-----------------|-------------------|
| **Search** | ✅ Unlimited | ✅ 2 per day | ✅ Unlimited basic |
| **Scan** | ✅ Unlimited | ✅ 2 per day | ✅ Unlimited basic |
| **AI Analysis** | ✅ Always | ✅ First 2 | ❌ No |
| **Chatbot** | ✅ Always | ✅ First 2 | ❌ No |
| **Recommendations** | ✅ Always | ✅ First 2 | ❌ No |
| **Health Score** | ✅ Always | ✅ Always | ✅ Always |
| **Ingredients** | ✅ Always | ✅ Always | ✅ Always |
| **Popup** | ❌ Never | ✅ After limit | ❌ No more |

## 🎨 Badge States

### Search Badge Colors:

```css
/* Green - Premium available */
✨ 2 premium searches left today
Color: #4CAF50 (Green)

✨ 1 premium search left today
Color: #4CAF50 (Green)

/* Orange - Free only */
🔒 Free search only (no AI)
Color: #FF9800 (Orange)

/* No badge - Premium user */
(Hidden)
```

## 🔔 Popup Timing

### When Popups Appear:

1. **After 2nd search**: When user views results
   - Delay: 1 second (smooth UX)
   - Message: "Premium Searches Complete!"

2. **After 2nd scan**: When user views results
   - Delay: 1 second (smooth UX)
   - Message: "Premium Scans Complete!"

3. **Never again**: After user dismisses
   - Free mode continues silently
   - Badge updates instead

### When Popups DON'T Appear:

- ❌ On 1st search/scan
- ❌ On 3rd+ searches (after limit)
- ❌ For premium users (ever)
- ❌ After user dismisses once

## 📝 Message Examples

### Search Limit Popup:
```
🎯 Premium Searches Complete!

You've used your 2 premium searches today!

You can still search for free (without AI 
analysis), or upgrade for unlimited premium 
searches.

[Continue Free] [Upgrade Now]
```

### Scan Limit Popup:
```
🎯 Premium Scans Complete!

You've used your 2 premium scans today!

You can still scan for free (without AI 
analysis), or upgrade for unlimited premium 
scans.

[Continue Free] [Upgrade Now]
```

## 🎯 Key Principles

1. **Never Block Users**
   - Always allow searching/scanning
   - Just reduce features after limit

2. **Clear Communication**
   - Badge shows exact status
   - Popup explains clearly
   - No surprises

3. **Respect User Choice**
   - Can continue free
   - Can upgrade anytime
   - No pressure

4. **Fair System**
   - 2+2 = 4 premium uses per day
   - Resets daily
   - Always usable

## ✅ Testing Scenarios

### Scenario 1: New User Flow
```
1. Open app → 2 scans + 2 searches
2. Search product → Premium ✅
3. Badge shows "1 left"
4. Search again → Premium ✅
5. Popup appears
6. Click "Continue Free"
7. Search again → Basic only
8. Badge shows "Free only"
9. Next day → Reset to 2 again
```

### Scenario 2: Premium User
```
1. Open app → Unlimited
2. No badges shown
3. All searches premium
4. All scans premium
5. No popups ever
```

### Scenario 3: Mixed Usage
```
1. Use 1 scan → 1 left
2. Use 2 searches → 0 left
3. Search → Free mode
4. Scan → Premium (still 1 left)
5. Independent counters ✅
```

---

**Summary**: Fair, clear, and user-friendly! 🎉
