import React, { useState, useEffect, createContext, useContext } from "react";
import api, { TOKEN_KEY, USER_KEY } from "../services/api";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || {};
};

const normalizeUser = (user) => {
  if (!user) return null;

  let userPermissions = user.permissions || {};

  // For Admin accounts, grant full capability access unless explicitly restricted
  if (user.role === "admin") {
    userPermissions = {
      isDashboardCapability: true,
      isPrinterCapability: true,
      isStockCapability: true,
      isRevenueCapability: true,
      isAddAdmin: true,
      isAddManager: true,
      isExtraCapability: true,
      all: true,
      ...userPermissions,
    };
  }

  const normalized = {
    ...user,
    id: user.id || user._id,
    uid: user.id || user._id || "",
    role: user.role || "manager",
    permissions: userPermissions,
  };

  // Sync auxiliary localStorage items for layout components
  try {
    if (normalized.name) localStorage.setItem("userName", normalized.name);
    if (normalized.role) localStorage.setItem("userRole", normalized.role);
    if (normalized.branch) localStorage.setItem("userBranchName", normalized.branch);
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
      const { token, user } = response.data.data;
      const normalizedUser = normalizeUser(user);

      localStorage.setItem(TOKEN_KEY, token);
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
