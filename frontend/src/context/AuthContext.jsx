import React, { useState, useEffect, createContext, useContext } from "react";
import api, { TOKEN_KEY, USER_KEY } from "../services/api";
import { normalizeUser as adapterNormalizeUser, hasPermission as checkPermission } from "../utils/dataAdapter";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || {};
};

const normalizeUser = (user) => {
  if (!user) return null;
  const normalized = adapterNormalizeUser(user);

  // Sync auxiliary localStorage items for layout components
  try {
    if (normalized.name) localStorage.setItem("userName", normalized.name);
    if (normalized.role) localStorage.setItem("userRole", normalized.role);
    if (normalized.branchName || normalized.branch) {
      localStorage.setItem("userBranchName", normalized.branchName || normalized.branch);
    }
    if (normalized.profilePicUrl) localStorage.setItem("profilePicUrl", normalized.profilePicUrl);
  } catch (e) {
    // Ignore storage sync errors
  }

  return normalized;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on startup
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setCurrentUser(null);
        setRole(null);
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        if (response.data && response.data.success && response.data.data) {
          const user = response.data.data;
          const normalizedUser = normalizeUser(user);

          setCurrentUser(normalizedUser);
          setRole(normalizedUser.role);
          setPermissions(normalizedUser.permissions);
          localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        } else {
          throw new Error("Invalid session data");
        }
      } catch (error) {
        console.warn("Session restoration failed, clearing token:", error?.message);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setCurrentUser(null);
        setRole(null);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    if (response.data && response.data.success) {
      const data = response.data.data || {};
      const token = data.accessToken || data.token;
      const user = data.user || data;
      const normalizedUser = normalizeUser(user);

      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));

      setCurrentUser(normalizedUser);
      setRole(normalizedUser.role);
      setPermissions(normalizedUser.permissions);

      return normalizedUser;
    } else {
      throw new Error(response.data?.message || "Login failed");
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userBranchName");
      localStorage.removeItem("profilePicUrl");
      setCurrentUser(null);
      setRole(null);
      setPermissions(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetPassword = async (email) => {
    const res = await api.post("/auth/send-reset-email", { email });
    return res.data;
  };

  const value = {
    currentUser,
    role,
    permissions,
    hasPermission: (key) => checkPermission(currentUser, key),
    login,
    logout,
    resetPassword,
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <div className="revenue-loading-box" style={{ maxWidth: "420px", width: "90%", margin: "0 auto" }}>
          <div className="revenue-loading-spinner"></div>
          <p>Initializing secure session...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
