# Bulk Delete Utility - Usage Guide

## Overview

A utility to delete bulk records based on branch name via the REST API.

## ⚠️ IMPORTANT: Authentication Required

**You MUST be logged in as an administrator to use this utility!**

The function checks for authentication and will show an error if you're not logged in:

- ✅ **Login first** before running delete commands
- ❌ **Will not work** without authentication
- 🔒 API routes require an authenticated admin session

## Location

`src/utils/deleteRecordsByBranch.js`

## Method 1: Using Browser Console (Recommended for Quick Deletes)

### Step 1: Make sure the app is running and **YOU ARE LOGGED IN** ⚠️

### Step 2: Open Browser Console (F12)

### Step 3: Run the delete command

```javascript
// Delete from a single collection
await window.deleteRecordsByBranch("printerReadings", "Kengeri");

// Delete from multiple collections
await window.deleteAllBranchData("Kengeri");
```

### Available Collections:

- `printerReadings`
- `jumboXeroxReadings`
- `totalAmountReadings`
- `stockReadings`
- `finalizedDates`
- `pastDateRequests`

## Method 2: Import in a Component

```javascript
import {
  deleteRecordsByBranch,
  deleteAllBranchData,
} from "../utils/deleteRecordsByBranch";

// In your component or handler
const handleDelete = async () => {
  const result = await deleteRecordsByBranch("stockReadings", "Marathahalli");
  console.log(result);
};

// Delete from all collections
const handleDeleteAll = async () => {
  const result = await deleteAllBranchData("BranchName");
  console.log(result);
};
```

## Method 3: Create a Temporary Admin Page

Add a button in your admin dashboard:

```javascript
import { deleteRecordsByBranch } from "../utils/deleteRecordsByBranch";

const AdminBulkDelete = () => {
  const [collection, setCollection] = useState("printerReadings");
  const [branchName, setBranchName] = useState("");

  const handleDelete = async () => {
    if (!branchName.trim()) {
      alert("Please enter a branch name");
      return;
    }

    const result = await deleteRecordsByBranch(collection, branchName);
    alert(result.message);
  };

  return (
    <div>
      <h3>Bulk Delete Records</h3>
      <select
        value={collection}
        onChange={(e) => setCollection(e.target.value)}
      >
        <option value="printerReadings">Printer Readings</option>
        <option value="jumboXeroxReadings">Jumbo Xerox Readings</option>
        <option value="totalAmountReadings">Total Amount Readings</option>
        <option value="stockReadings">Stock Readings</option>
        <option value="finalizedDates">Finalized Dates</option>
      </select>

      <input
        type="text"
        placeholder="Branch Name"
        value={branchName}
        onChange={(e) => setBranchName(e.target.value)}
      />

      <button onClick={handleDelete}>Delete Records</button>
    </div>
  );
};
```

## Examples

### Example 1: Delete all printer readings for Kengeri branch

```javascript
await window.deleteRecordsByBranch("printerReadings", "Kengeri");
```

### Example 2: Delete all stockReadings for Marathahalli branch

```javascript
await window.deleteRecordsByBranch("stockReadings", "Marathahalli");
```

### Example 3: Delete ALL data for a branch (all collections)

```javascript
await window.deleteAllBranchData("Kengeri");
```

### Example 4: Delete from specific collections only

```javascript
await window.deleteAllBranchData("Kengeri", [
  "printerReadings",
  "stockReadings",
]);
```

## Safety Features

1. **Confirmation Dialog**: Always shows count and asks for confirmation
2. **Progress Logging**: Console shows detailed progress
3. **Error Handling**: Failed deletions are tracked and reported
4. **Detailed Results**: Returns summary with success/failure counts

## Return Object Structure

```javascript
{
  success: boolean,           // true if all deletions succeeded
  deletedCount: number,        // number of successfully deleted documents
  errors: Array,              // array of error objects (if any)
  message: string             // summary message
}
```

## Console Output Example

```
� Authenticated as: admin@example.com
�🔍 Starting bulk delete for collection: printerReadings, branch: Kengeri
📥 Fetching matching documents...
📊 Found 45 documents to delete
🗑️ Deleting documents...
✓ Deleted document: Kengeri_20240901 (1/45)
✓ Deleted document: Kengeri_20240902 (2/45)
...
✅ Bulk delete completed!
   Total documents deleted: 45
   Failed deletions: 0
```

## ⚠️ WARNINGS

1. **Authentication Required**: You MUST be logged in first
2. **Irreversible**: Deleted data CANNOT be recovered
3. **No Undo**: Always double-check branch name before confirming
4. **Production Data**: Be extra careful in production environment
5. **Backup First**: Consider backing up data before bulk deletion
6. **Test First**: Test with a small dataset or test branch first

## Troubleshooting

### Error: "Authentication required"

- **Solution**: Login to your account first
- The utility will show an alert if you're not logged in
- Check console: should show "👤 Authenticated as: your-email@example.com"

### Error: "Permission denied"

- Ensure you're logged in as admin
- Check Firestore security rules
- Verify your account has delete permissions

### Error: "Collection not found"

- Verify the collection name spelling
- Check if collection exists in Firebase

### No documents found

- Double-check branch name (case-sensitive)
- Verify data exists in Firebase Console

## Quick Reference

```javascript
// Single collection delete
window.deleteRecordsByBranch("collectionName", "BranchName");

// All collections delete
window.deleteAllBranchData("BranchName");

// Specific collections only
window.deleteAllBranchData("BranchName", ["printerReadings", "stockReadings"]);
```
