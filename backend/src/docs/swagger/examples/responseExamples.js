/**
 * Response bodies whose shape differs from "a single record of the resource", keyed "METHOD /path".
 * Everything else gets an example generated from the resource's model (see lib/autoDocs.js).
 */
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWNmODE5YzMxMjI0MmUzYmRlMjJmYjsiLCJpYXQiOjE3OTQ0NzAwMDB9.signature";
const REFRESH = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWNmODE5YzMxMjI0MmUzYmRlMjJmYjsiLCJ0eXBlIjoicmVmcmVzaCJ9.signature";

module.exports = {
  "POST /auth/login": {
    success: true,
    message: "Login successful",
    data: { accessToken: TOKEN, refreshToken: REFRESH },
  },
  "POST /auth/refresh": {
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken: TOKEN, refreshToken: REFRESH },
  },
  "POST /auth/refresh-token": {
    success: true,
    message: "Token refreshed successfully",
    data: { accessToken: TOKEN, refreshToken: REFRESH },
  },
  "POST /auth/logout": {
    success: true,
    message: "Logged out successfully",
    data: { loggedOut: true, userId: "6acf819c312242e3bde22bfb" },
  },
};
