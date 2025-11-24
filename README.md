# Contentstack Create-Only Reference Field Extension

A custom reference field extension for Contentstack that **only allows creating new entries** - no "Choose existing entry" option. Perfect for workflows where you always want to create fresh content.

## Features

✅ **Create-Only Mode** - Only "Create New Entry" button, no entry selection
✅ **Auto-Detection** - Automatically reads referenced content types from field configuration
✅ **Multiple Content Types** - Shows selector if field references multiple content types
✅ **Single/Multiple Selection** - Supports both single and multiple reference modes
✅ **Entry Management** - View and remove selected entries
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

1. Go to **Settings → Extensions**
2. Click **+ New Extension**
3. Select **Custom Field**
4. Choose **Upload** method:
   - **Hosted**: Paste your `index.html` URL
   - **Self-hosted**: Upload `index.html` directly (max 500KB)

### 4. Configure Field in Content Type

1. Open your Content Type
2. Add a **Reference** field (or edit existing one)
3. In the field settings:
   - **Data Type**: Reference
   - **Select Content Types**: Choose which content types can be referenced
   - **Multiple**: Enable if you want multiple entries
4. Under **Extension** tab:
   - Select your **Create-Only Reference Field** extension

### 5. Test

Open an entry and test the custom field:
- Click "Create New Entry" button
- If multiple content types are configured, select one
- Entry creation modal opens
- After saving, entry appears in the field
- Use "Remove" button to delete references

## How It Works

The extension:
1. Reads `field.schema.reference_to` to get configured content types
2. Creates entries using `extension.stack.createEntry(contentTypeUid)`
3. Stores references in format: `[{ uid: "...", _content_type_uid: "..." }]`
4. Supports both single and multiple selection modes
5. Auto-updates UI and adjusts iframe height

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
