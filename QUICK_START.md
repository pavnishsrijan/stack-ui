# Quick Start Guide

## 🚀 3-Step Setup

### 1️⃣ Install Extension
```
Settings → Extensions → + New Extension

Type: Custom Field
Data Type: Reference
Multiple: ✅
URL: https://your-hosted-url/index.html
Config: (leave empty)
```

### 2️⃣ Configure Field
```
Content Models → Your Content Type → + Add Field

Field Type: Reference
Refer to: ✅ Select content types (e.g., Product, Category)
Multiple: ✅ (optional)
Extension Tab: Select "Create-Only Reference Field"
```

### 3️⃣ Use It!
```
Go to any entry → Find your field → Click "Create New Entry"
```

---

## 🎯 Key Points

✅ **No Config Needed** - Extension auto-detects content types from field settings

✅ **Reusable** - Install once, use in any Reference field

✅ **Smart Detection**:
- 1 content type → Direct create button
- Multiple types → Shows selector modal

✅ **Respects Field Settings**:
- Multiple enabled → Can add many entries
- Multiple disabled → One entry only, button hides after

---

## 📝 Important: Where to Configure Content Types

**NOT in extension config** ❌

**IN the field settings** ✅

When adding a Reference field to your content type, the "Refer to" section determines which content types the extension can create.

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "No content types configured" error | Check "Refer to" in field settings |
| Button doesn't appear | Check extension is selected in field's Extension tab |
| Console errors about post-robot | Ignore - Contentstack platform issue, extension works fine |
| Entry not saving | Check browser console, verify content type exists |

---

## 📚 Full Documentation

See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for detailed step-by-step instructions.
See [README.md](README.md) for technical details and features.
