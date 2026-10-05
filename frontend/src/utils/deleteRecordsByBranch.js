import api, { TOKEN_KEY } from "../services/api";

/**
 * Standalone utility to delete branch-related records via REST API endpoints
 *
 * @param {string} resourcePath - The API resource (e.g. "printer-readings", "stock-readings")
 * @param {string} branchName - The branch name to filter by
 * @returns {Promise<{success: boolean, deletedCount: number, errors: Array}>}
 */
export const deleteRecordsByBranch = async (resourcePath, branchName) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      const errorMsg =
        "Authentication required! Please login first before using this utility.";
      console.error(errorMsg);
      alert("You must be logged in to use this utility.");
      return {
        success: false,
        deletedCount: 0,
        errors: [{ error: "User not authenticated" }],
        message: errorMsg,
      };
    }

    console.log(`Starting delete operation for resource: ${resourcePath}, branch: ${branchName}`);

    // Call REST endpoint
    const response = await api.delete(`/${resourcePath}?branch=${encodeURIComponent(branchName)}`);

    return {
      success: true,
      deletedCount: response.data?.data?.deletedCount || 0,
      errors: [],
      message: `Successfully processed branch records for ${branchName}`,
    };
  } catch (error) {
    console.error("Error in deleteRecordsByBranch operation:", error);
    return {
      success: false,
      deletedCount: 0,
      errors: [{ error: error.message }],
      message: `Failed: ${error?.response?.data?.message || error.message}`,
    };
  }
};

export const deleteAllBranchData = async (branchName) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    alert("You must be logged in to use this utility.");
    return {
      success: false,
      message: "Authentication required. Please login first.",
      totalDeleted: 0,
      totalErrors: 1,
      results: [],
    };
  }

  const confirmAll = window.confirm(
    `WARNING: This will delete records for branch "${branchName}".\n\nThis action cannot be undone!\n\nClick OK to proceed or Cancel to abort.`
  );

  if (!confirmAll) {
    return { success: false, message: "Operation cancelled" };
  }

  try {
    // Delete branch via REST API
    const response = await api.get(`/branches`);
    const branches = response.data?.data || [];
    const targetBranch = branches.find(
      (b) => (b.name || "").toLowerCase() === (branchName || "").toLowerCase()
    );

    if (targetBranch) {
      await api.delete(`/branches/${targetBranch.id || targetBranch._id}`);
    }

    return {
      success: true,
      totalDeleted: 1,
      totalErrors: 0,
      results: [{ status: "Branch deleted" }],
    };
  } catch (error) {
    console.error("Error in deleteAllBranchData:", error);
    return {
      success: false,
      totalDeleted: 0,
      totalErrors: 1,
      results: [{ error: error.message }],
    };
  }
};

if (typeof window !== "undefined") {
  window.deleteRecordsByBranch = deleteRecordsByBranch;
  window.deleteAllBranchData = deleteAllBranchData;
}

export default deleteRecordsByBranch;
