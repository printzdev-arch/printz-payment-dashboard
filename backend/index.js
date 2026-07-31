const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

// --- 1. createUser Function with Improved Security Check ---
exports.createUser = functions.https.onCall(async (data, context) => {
  // --- SAFER SECURITY CHECK (Fix for CORS error) ---
  // First, check if the auth object exists at all.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  // Now that we know auth exists, we can safely check the user's role.
  const callerDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (callerDoc.data().role !== "admin") {
     throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins are allowed to create new users."
    );
  }

  // Get the new user's details, including the role
  const { email, password, name, phone, branch, location, role, permissions } = data;
  if (!email || !password || !name || !role) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required user data, including role.");
  }
  if (role !== 'admin' && role !== 'manager') {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role specified.");
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone,
      branch,
      location,
      role: role,
      permissions: permissions || {} // Ensure permissions is an object
    });

    return { success: true, message: `Successfully created ${role} ${name}`, uid: userRecord.uid };

  } catch (error) {
    console.error(`Error creating ${role}:`, error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// --- 2. deleteUser Function with Improved Security Check ---
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // --- SAFER SECURITY CHECK (Fix for CORS error) ---
  // First, check if the auth object exists at all.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  // Now that we know auth exists, we can safely check the user's role.
  const callerDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can perform this action."
    );
  }

  // Get the UID of the user to delete from the app
  const managerUid = data.uid;
  if (!managerUid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'uid' argument."
    );
  }

  try {
    await admin.auth().deleteUser(managerUid);
    await admin.firestore().collection("users").doc(managerUid).delete();

    return { success: true, message: `Successfully deleted user ${managerUid}` };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
