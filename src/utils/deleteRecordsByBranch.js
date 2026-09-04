import { db, auth } from "../services/authservice";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

/**
 * Standalone utility to delete all records from a collection where branchName matches
 *
 * Usage:
 * 1. Import this function in your component or run in browser console
 * 2. Call: deleteRecordsByBranch("collectionName", "BranchName")
 * 3. Check console for progress and results
 *
 * Example:
 * deleteRecordsByBranch("printerReadings", "Kengeri")
 * deleteRecordsByBranch("stockReadings", "Marathahalli")
 *
 * @param {string} collectionName - The Firebase collection name (e.g., "printerReadings", "stockReadings")
 * @param {string} branchName - The branch name to filter by (e.g., "Kengeri", "Marathahalli")
 * @returns {Promise<{success: boolean, deletedCount: number, errors: Array}>}
 */
export const deleteRecordsByBranch = async (collectionName, branchName) => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      const errorMsg =
        "❌ Authentication required! Please login first before using this utility.";
      console.error(errorMsg);
      alert(
        "⚠️ You must be logged in to use this utility.\n\nPlease login to your account and try again."
      );
      return {
        success: false,
        deletedCount: 0,
        errors: [{ error: "User not authenticated" }],
        message: "Authentication required. Please login first.",
      };
    }

    console.log(`👤 Authenticated as: ${auth.currentUser.email}`);
    console.log(
      `🔍 Starting bulk delete for collection: ${collectionName}, branch: ${branchName}`
    );

    // Query all documents with matching branchName
    const q = query(
      collection(db, collectionName),
      where("branchName", "==", branchName)
    );

    console.log("📥 Fetching matching documents...");
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("✅ No documents found matching the criteria.");
      return {
        success: true,
        deletedCount: 0,
        errors: [],
        message: "No documents found to delete",
      };
    }

    console.log(`📊 Found ${querySnapshot.size} documents to delete`);

    // Confirm before deletion
    const confirmDelete = window.confirm(
      `⚠️ WARNING: This will permanently delete ${querySnapshot.size} records from "${collectionName}" where branchName = "${branchName}".\n\nThis action cannot be undone!\n\nClick OK to proceed or Cancel to abort.`
    );

    if (!confirmDelete) {
      console.log("❌ Deletion cancelled by user");
      return {
        success: false,
        deletedCount: 0,
        errors: [],
        message: "Deletion cancelled by user",
      };
    }

    // Delete documents one by one with progress tracking
    const errors = [];
    let deletedCount = 0;

    console.log("🗑️ Deleting documents...");

    for (const docSnapshot of querySnapshot.docs) {
      try {
        await deleteDoc(doc(db, collectionName, docSnapshot.id));
        deletedCount++;
        console.log(
          `✓ Deleted document: ${docSnapshot.id} (${deletedCount}/${querySnapshot.size})`
        );
      } catch (error) {
        console.error(`✗ Failed to delete document: ${docSnapshot.id}`, error);
        errors.push({
          documentId: docSnapshot.id,
          error: error.message,
        });
      }
    }

    console.log(`\n✅ Bulk delete completed!`);
    console.log(`   Total documents deleted: ${deletedCount}`);
    console.log(`   Failed deletions: ${errors.length}`);

    if (errors.length > 0) {
      console.error("⚠️ Errors encountered:", errors);
    }

    return {
      success: errors.length === 0,
      deletedCount,
      errors,
      message: `Successfully deleted ${deletedCount} of ${querySnapshot.size} documents`,
    };
  } catch (error) {
    console.error("❌ Error in bulk delete operation:", error);
    return {
      success: false,
      deletedCount: 0,
      errors: [{ error: error.message }],
      message: `Failed: ${error.message}`,
    };
  }
};

/**
 * Helper function to delete records from multiple collections for a branch
 * Useful when you want to clear all data for a branch across all collections
 *
 * @param {string} branchName - The branch name to delete
 * @param {Array<string>} collections - Array of collection names (optional, defaults to all main collections)
 * @returns {Promise<Object>} Results summary
 */
export const deleteAllBranchData = async (branchName, collections = null) => {
  // Check if user is authenticated
  if (!auth.currentUser) {
    const errorMsg =
      "❌ Authentication required! Please login first before using this utility.";
    console.error(errorMsg);
    alert(
      "⚠️ You must be logged in to use this utility.\n\nPlease login to your account and try again."
    );
    return {
      success: false,
      message: "Authentication required. Please login first.",
      totalDeleted: 0,
      totalErrors: 1,
      results: [],
    };
  }

  const defaultCollections = [
    "printerReadings",
    "jumboXeroxReadings",
    "totalAmountReadings",
    "stockReadings",
    "finalizedDates",
  ];

  const collectionsToDelete = collections || defaultCollections;

  console.log(`🗑️ Starting deletion of ALL data for branch: ${branchName}`);
  console.log(`📋 Collections to clean: ${collectionsToDelete.join(", ")}`);

  const confirmAll = window.confirm(
    `⚠️ CRITICAL WARNING: This will delete ALL records for branch "${branchName}" from ${
      collectionsToDelete.length
    } collections:\n\n${collectionsToDelete.join(
      "\n"
    )}\n\nThis action cannot be undone!\n\nClick OK to proceed or Cancel to abort.`
  );

  if (!confirmAll) {
    console.log("❌ Operation cancelled by user");
    return { success: false, message: "Operation cancelled" };
  }

  const results = [];

  for (const collectionName of collectionsToDelete) {
    console.log(`\n🔄 Processing collection: ${collectionName}`);
    const result = await deleteRecordsByBranch(collectionName, branchName);
    results.push({
      collection: collectionName,
      ...result,
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(60));

  results.forEach((result) => {
    console.log(
      `${result.collection}: ${result.deletedCount} deleted, ${result.errors.length} errors`
    );
  });

  const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  console.log("=".repeat(60));
  console.log(`Total records deleted: ${totalDeleted}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log("=".repeat(60));

  return {
    success: totalErrors === 0,
    totalDeleted,
    totalErrors,
    results,
  };
};

// Make it globally accessible for console usage
if (typeof window !== "undefined") {
  window.deleteRecordsByBranch = deleteRecordsByBranch;
  window.deleteAllBranchData = deleteAllBranchData;
}

export default deleteRecordsByBranch;
