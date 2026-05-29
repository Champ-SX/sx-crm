# LINE Friends Import Guide

This guide explains how to export your LINE Official Account (LINE OA) friends list and import them into SX-CRM.

## Overview

SX-CRM now supports importing LINE friends with the following information:
- **Name**: Friend's display name
- **Line ID**: Unique LINE identifier (U-prefix format)
- **Tags**: Custom tags for organizing friends (optional)

Each friend will be added to SX-CRM as a contact person under their name.

---

## Step 1: Download the Import Template

1. Open the **Import** section in SX-CRM
2. Click the **"download template"** link next to "LINE friends" in the "Supported formats" section
3. Save the file as `LINE-Friends-Import-Template.xlsx`

Alternatively, you can download the template directly:
- File: `LINE-Friends-Import-Template.xlsx`
- Location: Available in the import page

---

## Step 2: Export Friends from LINE Official Account

### Option A: Export from LINE Admin (Recommended)

1. Log in to [LINE Official Account Manager](https://official.line.me)
2. Navigate to **Contacts** or **Friends List**
3. Look for an **Export** or **Download** option
4. Select the format that matches the template (Name, Line ID, Tags)
5. Save the exported file

### Option B: Manual Entry

If LINE doesn't provide a direct export function:

1. Open the template file (`LINE-Friends-Import-Template.xlsx`)
2. Delete the example rows
3. Manually enter each friend's:
   - **Name**: Their display name from LINE
   - **Line ID**: Copy from their LINE profile URL or settings (typically starts with "U" followed by 32 characters)
   - **Tags**: Enter tags separated by commas (e.g., "VIP,Marketing,Event")

### Finding LINE IDs

- **In LINE Official Account**: View friend profile → Look for ID field
- **In LINE App**: Go to friend's profile → Share button → May show ID or profile URL containing the ID
- **From URL**: LINE profile URLs often contain the ID: `line://friend/XXXXX`

---

## Step 3: Prepare Your Data File

Open the exported or manually-created file in Excel/Spreadsheet:

1. Ensure columns are labeled exactly:
   - Column A: `Name`
   - Column B: `Line ID`
   - Column C: `Tags`

2. Verify your data:
   ```
   Name                    | Line ID                          | Tags
   John Smith             | U1234567890abcdef1234567890abcde | VIP,Sales
   Jane Doe              | U1234567890abcdef1234567890abcd2 | Event,Marketing
   ```

3. Save the file as `.xlsx` format

---

## Step 4: Import into SX-CRM

1. Open SX-CRM and navigate to **Import**
2. **Step 1 - Upload**:
   - Drag and drop your Excel file, or click to browse
   - Select the file with your LINE friends data

3. **Step 2 - Preview**:
   - Review the preview of companies and contacts
   - Each LINE friend becomes a **Contact Person** under a company with the same name
   - LINE ID is stored in the notes field as `Line ID: [ID]`
   - Tags are used to categorize the import

4. **Step 3 - Complete**:
   - Click **"Import All"** to add the friends to SX-CRM
   - You'll see a confirmation with the number of companies and contacts added

---

## Data Mapping in SX-CRM

When you import LINE friends, here's how the data is mapped:

| LINE Field | SX-CRM Field | Notes |
|-----------|-------------|-------|
| Name | Contact Name | Used as display name |
| Name | Company Name | Creates a company with the name |
| Line ID | Notes | Stored as "Line ID: [ID]" in contact notes |
| Tags | Category/Role | Used to organize and categorize the contact |

---

## Tips & Best Practices

1. **Use consistent naming**: Keep friend names consistent between exports
2. **Leverage tags**: Use tags to organize friends by department, event, or relationship type
   - Examples: "VIP", "Marketing", "Event", "Hotels", "Brand"
3. **Batch imports**: You can import multiple files at once - each friend becomes a separate contact
4. **Update contacts**: If you re-import with the same names, duplicates are prevented by email. Since LINE data has no email, duplicates with the exact same name will be created - consider adding email data if available
5. **Line IDs are preserved**: All LINE IDs are stored in the contact notes for reference

---

## Troubleshooting

### "No contacts found" error
- Verify the Excel file has columns labeled exactly: `Name`, `Line ID`, `Tags`
- Ensure you have at least one row of data (excluding headers)
- Check that column headers are in row 1

### Missing Line IDs
- Some LINE accounts may not expose LINE IDs publicly
- You can still import with just Name and Tags - the Line ID field can be left blank
- LINE ID will be "blank" in the notes if not provided

### Duplicate contacts
- The import system checks for duplicate emails (not LINE IDs)
- Since LINE data typically has no email, re-importing the same list will create duplicates
- Consider adding email addresses if available, or managing duplicates manually

### File format issues
- Make sure the file is saved as `.xlsx` (Excel format)
- `.xls` and `.csv` formats are also supported
- Check that file isn't corrupted by opening it in Excel first

---

## File Format Reference

### LINE Friends Import Template Format

```
Name                     | Line ID                          | Tags
========================|==================================|====================
Example Friend 1        | U1234567890abcdef1234567890abcd1| VIP,Marketing
Example Friend 2        | U1234567890abcdef1234567890abcd2| Event,Brand
```

### LINE ID Format
- Format: `U` followed by 32 hexadecimal characters
- Length: 33 characters total
- Examples:
  - `U1234567890abcdef1234567890abcdef`
  - `Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p`

---

## Questions or Issues?

If you encounter issues:
1. Check that your Excel file matches the template format
2. Verify Line IDs are in the correct format
3. Try importing a small sample (1-2 friends) first to test
4. Review the error message in the import page

For technical questions about SX-CRM, check the main documentation or contact your administrator.
