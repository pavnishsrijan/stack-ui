# Installation Guide - Step by Step

## 📋 Overview

This extension requires NO configuration parameters. It automatically detects content types from your field settings.

---

## Step 1: Install Extension in Contentstack

### Go to Extensions Settings
1. Login to Contentstack
2. Navigate to: **Settings** → **Extensions**
3. Click **+ New Extension** button

### Fill Extension Details

| Field | Value |
|-------|-------|
| **Extension Type** | Custom Field |
| **Title** | Create-Only Reference Field |
| **Field Data Type** | Reference |
| **Multiple** | ✅ Check this box |
| **Hosting** | Choose one below |

### Hosting Options

**Option 1: External Hosting (Recommended)**
- Select: **Hosted on external server**
- **Extension URL**: `https://your-domain.com/index.html`
- Example: `https://stack-ui-rho.vercel.app/`

**Option 2: Self-Hosted**
- Select: **Upload HTML file**
- Upload your `index.html` file
- Max size: 500 KB

### Configuration Section
**Leave empty** - No custom configuration needed! ✅

Click **Save** to install the extension.

---

## Step 2: Add Field to Content Type

This is the **most important step** - where you define which content types can be created!

### Navigate to Content Type
1. Go to: **Content Models**
2. Select your content type (or create new one)
3. Click **Edit**

### Add Reference Field

Click **+ Add Field** or **+ New Field**

#### Basic Tab

| Setting | Value |
|---------|-------|
| **Field Type** | Reference |
| **Display Name** | Your field name (e.g., "Related Products") |
| **Unique ID** | Auto-generated from display name |
| **Help Text** | Optional description |

#### Reference Settings Tab

**This is where the magic happens!** 🎯

| Setting | What to Do |
|---------|------------|
| **Refer to** | ✅ **Check the content types you want to allow creating** |
| **Multiple** | ✅ Check if you want multiple entries |

**Example Configuration:**
```
Refer to:
  ✅ Product
  ✅ Category
  ☐ Author
  ☐ Blog Post
```

With this configuration:
- Click button → Opens selector showing "Product" and "Category"
- Select one → Opens that content type's creation modal
- Save entry → Reference is stored

#### Extension Tab

| Setting | Value |
|---------|-------|
| **Use Custom Extension** | ✅ Enable |
| **Select Extension** | Create-Only Reference Field |

Click **Save** to add the field.

---

## Step 3: Test the Extension

### Open an Entry
1. Go to **Entries**
2. Open an existing entry or create new one
3. Find your custom reference field

### Test Creating an Entry

**If Single Content Type:**
- You see: "Create New Entry" button
- Click it → Entry creation modal opens for that content type
- Fill and save → Entry appears in field

**If Multiple Content Types:**
- You see: "Create New Entry" button
- Click it → Modal appears: "Select Content Type"
- Choose a content type → Entry creation modal opens
- Fill and save → Entry appears in field

### Test Multiple Entries (if enabled)
- Create first entry → Appears in list
- Create second entry → Appears below first
- Each entry shows UID and Content Type
- Click "Remove" → Entry is removed from reference

---

## 📊 Visual Flow

```
Field Configuration (Step 2)
    ↓
Select "Refer to": [Product, Category]
    ↓
User clicks "Create New Entry"
    ↓
Extension reads: field.schema.reference_to = ["product", "category"]
    ↓
Shows selector: "Product" or "Category"?
    ↓
User selects "Product"
    ↓
Opens: stack.createEntry("product")
    ↓
User fills form and saves
    ↓
Entry reference stored: { uid: "...", _content_type_uid: "product" }
    ↓
Displays in field with "Remove" button
```

---

## ❓ Common Questions

### Q: Do I need to add any configuration parameters?
**A:** No! The extension automatically reads content types from the field's "Refer to" setting.

### Q: What if I want to restrict to only one content type?
**A:** In the field's "Refer to" setting, check only ONE content type. The extension will automatically skip the selector and open creation modal directly.

### Q: Can I use this for single references?
**A:** Yes! Uncheck "Multiple" in the field settings. After creating one entry, the "Create New Entry" button will hide.

### Q: Where do I configure which content types can be created?
**A:** In **Step 2** above, when configuring the Reference field in your content type. Check the boxes in the "Refer to" section.

### Q: What about the console errors?
**A:** The `extensionEvent` errors are from Contentstack's platform, not your extension. Safe to ignore - your extension will work perfectly.

---

## 🎯 Key Takeaway

**NO extension configuration needed!**

Just install the extension once, then control which content types can be created by selecting them in the field's "Refer to" setting. This makes the extension reusable across different fields with different content type combinations.
