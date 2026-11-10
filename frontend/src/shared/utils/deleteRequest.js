/**
 * Delete requests: an admin deletes a record straight away; anyone else sends a request that an admin
 * approves first. Use these where a manager can click Delete.
 *
 *   const result = await deleteOrRequest((reason) => api.deleteThing(id, reason));
 *   if (result.cancelled) return;
 *   if (result.requested) toast.info(result.message);   // nothing was deleted yet
 *   else { ...remove it from the screen... }
 */

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || localStorage.getItem("printz_user") || "{}") || {};
  } catch {
    return {};
  }
};

/** Admin and Super Admin delete directly. */
export const isAdminUser = (user = readUser()) => {
  const role = String(user.role || localStorage.getItem("userRole") || "").toLowerCase();
  const code = String(user.roleCode || "").toLowerCase();
  return ["admin", "super_admin", "superadmin"].includes(role) || ["admin", "super_admin", "internal_admin"].includes(code);
};

/** True when the server answered with "request sent" instead of deleting. */
export const wasRequested = (response) =>
  Boolean(response?.data?.pendingApproval || response?.pendingApproval || response?.status === 202);

/**
 * @param {(reason: string|undefined) => Promise<any>} call  performs the DELETE; receives the reason (undefined for admins)
 * @returns {Promise<{cancelled?: boolean, requested?: boolean, message?: string, response?: any}>}
 */
export async function deleteOrRequest(call) {
  let reason;
  if (!isAdminUser()) {
    const typed = window.prompt("This delete needs an admin's approval. Why should it be deleted? (at least 5 characters)");
    if (typed === null) return { cancelled: true };
    reason = typed.trim();
    if (reason.length < 5) {
      window.alert("Please enter a reason of at least 5 characters.");
      return { cancelled: true };
    }
  }
  const response = await call(reason);
  if (wasRequested(response)) {
    return {
      requested: true,
      message: response?.message || "Delete request sent to an admin for approval. The record is kept until it is approved.",
      response,
    };
  }
  return { response };
}
