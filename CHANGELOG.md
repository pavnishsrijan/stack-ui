# Changelog

All notable changes to this extension will be documented in this file.

## [1.1.0] - 2024-11-24

### ✨ Added
- **Edit Entry Feature** - Click on any entry card to open it for editing
- **Edit Button** - Dedicated green "Edit" button for each entry
- **Clickable Entry Cards** - Entire entry info area is now clickable with hover effect
- **Visual Feedback** - Hover effects on clickable elements
- **Button Grouping** - Edit and Remove buttons are now grouped together

### 🎨 Improved
- Enhanced UI with better button styling
- Added tooltips ("Click to edit entry")
- Improved spacing and layout of entry cards
- Better visual hierarchy with button colors:
  - Create: Blue (#2563eb)
  - Edit: Green (#10b981)
  - Remove: Red (#ef4444)

### 📚 Documentation
- Updated README with new edit features
- Added user action reference table
- Updated installation guides
- Created comprehensive CHANGELOG

## [1.0.0] - 2024-11-24

### 🎉 Initial Release

#### Features
- Create-only reference field (no "Choose existing" option)
- Auto-detection of referenced content types from field schema
- Support for multiple content types with selector modal
- Single and multiple entry selection modes
- Entry listing with UID and content type display
- Remove entry functionality
- Dynamic height adjustment
- Professional UI matching Contentstack design

#### Technical
- Built with Contentstack UI Extensions SDK 2.2.3
- No configuration parameters required
- Reads from field.schema.reference_to
- Data format: `[{ uid: "...", _content_type_uid: "..." }]`

#### Documentation
- Complete README with setup instructions
- Detailed INSTALLATION_GUIDE.md
- Quick start guide
- Troubleshooting section
