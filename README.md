# Contentstack Create-Only Reference Field Extension

A custom reference field extension for Contentstack that **only allows creating new entries** - no "Choose existing entry" option. Perfect for workflows where you always want to create fresh content.

## Features

✅ **Create-Only Mode** - Only "Create New Entry" button, no entry selection
✅ **Auto-Detection** - Automatically reads referenced content types from field configuration
✅ **Multiple Content Types** - Shows selector if field references multiple content types
✅ **Single/Multiple Selection** - Supports both single and multiple reference modes
✅ **Entry Management** - View, edit, and remove selected entries
✅ **Click to Edit** - Click anywhere on an entry card to open it for editing
✅ **Edit Button** - Dedicated "Edit" button to modify referenced entries
✅ **Professional UI** - Clean, modern interface matching Contentstack design

## Files

- `index.html` - Main UI page with embedded styles
- `app.js` - Extension logic
- `extension.json` - Extension configuration manifest

## Setup Instructions

### 1. Host Your Extension

Upload these files to a hosting service:
- **Vercel** (recommended for quick deployment)
- **Netlify**
- **GitHub Pages**
- **AWS S3 + CloudFront**
- Or use Contentstack's built-in hosting

### 2. Update Configuration

Edit `extension.json` and update the `src` URL:
```json
"src": "https://your-hosting-url.com/index.html"
```

### 3. Install in Contentstack

#### Option A: Upload via UI (Recommended)

1. Go to **Settings → Extensions**
2. Click **+ New Extension**
3. Select **Custom Field**
4. Fill in details:
   - **Title**: Create-Only Reference Field
   - **Field Data Type**: Reference
   - **Multiple**: ✅ (Check if you want to support multiple entries)
5. Choose hosting method:
   - **Hosted (External)**: Paste your `index.html` URL
   - **Self-hosted (Upload)**: Upload `index.html` directly (max 500KB)
6. **No custom configuration needed** - Leave config empty
7. Click **Save**

#### Option B: Upload via CLI

```bash
csdx cm:stacks:export-to-app --alias <stack-alias>
# Place extension.json in the extensions folder
csdx cm:stacks:import-to-app --alias <stack-alias>
```

### 4. Configure Field in Content Type

This is where you configure which content types can be created!

1. Go to **Content Models** → Select your content type
2. Click **Edit** or **+ New Field**
3. Add a **Reference** field:
   - **Display Name**: e.g., "Related Products"
   - **Unique ID**: e.g., "related_products"
   - **Data Type**: Reference
   - **Refer to**: ✅ **Select the content types** you want to allow creating
     - Example: Check "Product", "Category", "Brand"
     - The extension will detect these automatically!
   - **Multiple**: ✅ Enable if you want multiple entries
4. Go to the **Extension** tab:
   - **Select Extension**: Choose "Create-Only Reference Field"
5. Click **Save**

**Important**: The content types you select in "Refer to" are what the extension will use. No additional configuration needed!

### 5. Test

Open an entry and test the custom field:
- Click **"Create New Entry"** button
- If multiple content types are configured, select one
- Entry creation modal opens
- After saving, entry appears in the field
- Click on the entry card or **"Edit"** button to open/modify the entry
- Use **"Remove"** button to delete references

## How It Works

The extension:
1. Reads `field.schema.reference_to` to get configured content types
2. Creates entries using `extension.stack.createEntry(contentTypeUid)`
3. Opens entries for editing using `extension.stack.openEntry({ content_type_uid, uid })`
4. Stores references in format: `[{ uid: "...", _content_type_uid: "..." }]`
5. Supports both single and multiple selection modes
6. Auto-updates UI and adjusts iframe height

## User Actions

| Action | What Happens |
|--------|--------------|
| Click "Create New Entry" | Opens creation modal for selected content type |
| Click entry card (text area) | Opens the entry in edit mode |
| Click "Edit" button | Opens the entry in edit mode |
| Click "Remove" button | Removes the reference from the field |

## Configuration Options

When adding the field to your content type:

**Reference To**: Select one or more content types
- Single content type → Direct "Create" button
- Multiple content types → Shows content type selector modal

**Multiple**: Enable to allow multiple entry references

**Required**: Make field mandatory

## Technical Details

- **SDK Version**: 2.2.3 (with integrity hashes)
- **Data Type**: Reference
- **Field Format**: Array of objects with `uid` and `_content_type_uid`
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

**Error: "No content types configured"**
→ Ensure you've selected content types in the field's "Reference To" setting

**Entry not saving**
→ Check browser console for errors
→ Verify the referenced content type exists

**Extension not loading**
→ Ensure HTTPS hosting
→ Check CORS settings on your host
→ Verify extension URL is correct

**Console warnings about post-robot**
→ These are Contentstack platform messages, safe to ignore

## Development

To modify this extension:

1. Edit `app.js` for functionality changes
2. Edit styles in `index.html` `<style>` section
3. Test locally using a tool like `http-server` or `live-server`
4. Use ngrok for HTTPS tunnel during development
5. Deploy changes to your hosting service

## License

MIT - Feel free to modify and use in your projects
