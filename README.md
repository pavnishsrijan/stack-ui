# Contentstack Create-Only Reference Field Extension

This package provides a field-level UI extension for Contentstack that replaces the default Reference field UI, hiding "Choose existing entry" and exposing a "Create new entry" flow.

## Files
- `extension.json` — extension manifest.
- `index.html` — UI page loaded by Contentstack.
- `main.js` — extension logic.
- `style.css` — styling.

## Quick setup
1. Host these files on a static host (Vercel, Netlify, S3 + CloudFront).
2. Update `extension.json` -> `src` to point to your hosted `index.html`.
3. In Contentstack: Settings → Extensions → Add Extension → Field → provide URL to `index.html`.
4. Attach the extension to the reference field in your content type.
5. Test in the entry editor.

## Notes
- You may need to tweak SDK init and popup method names depending on the SDK version your Contentstack org exposes. Check browser console to inspect available globals (e.g., `ContentstackUIExtensions`).
- For a global app or organization-wide injection, convert this into a Custom App instead.
