import React, { useRef, useEffect } from "react";
import { useAuth } from "../../../app/providers/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { firstAllowedPath } from "../../../shared/access/pageAccess";

import logo from "../../../shared/assets/logo.png";
import sceneCss from "../scene/cartoonScene.css?raw";
import { getSceneMarkup } from "../scene/cartoonMarkup.js";
import { startCartoonScene } from "../scene/cartoonScene.js";

// Survives Login remounts, so a redirect ping-pong can be detected
let lastAutoRedirectAt = 0;

export default function Login() {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const submittingRef = useRef(false);
  const { login, role, currentUser } = useAuth();
  const navigate = useNavigate();

  // Navigate according to user's assigned role
  const handleRedirectByRole = (user) => {
    // A role set up in Role Management starts on the first page ticked for it
    const firstPage = firstAllowedPath(user);
    if (firstPage) {
      navigate(firstPage);
      return;
    }

    const isDes =
      user?.role === "designer" ||
      ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah", "guna"].some((n) =>
        (user?.name || "").toLowerCase().includes(n)
      ) ||
      (user?.email || "").toLowerCase() === "guna@gmail.com";

    if (isDes) {
      localStorage.setItem("userRole", "designer");
      navigate("/jobflow/design?view=my-jobs");
    } else if (user?.role === "admin" || user?.role === "super_admin") {
      navigate("/admin-dashboard");
    } else if (user?.role === "manager") {
      navigate("/manager-dashboard");
    } else if (
      user?.role === "branch_staff" ||
      user?.role === "branch_manager" ||
      user?.role === "branch_manager1"
    ) {
      // branch managers are not allowed on /manager-dashboard (manager/admin only);
      // sending them there bounces back to /login and loops forever
      navigate("/sale-orders");
    } else if (user?.role === "operator") {
      navigate("/v3/production/queue");
    } else if (user?.role === "qc_inspector") {
      navigate("/v3/quality-control/queue");
    } else if (user?.role === "staff" || user?.role === "cashier") {
      navigate("/sales-pos");
    } else {
      navigate("/manager-dashboard");
    }
  };

  // Always call the latest versions from inside the scene's long-lived callbacks
  const latest = useRef({});
  latest.current = { login, handleRedirectByRole };

  // Mount the animated login scene (isolated in a shadow root)
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${sceneCss}</style>${getSceneMarkup(logo)}`;

    const scene = startCartoonScene(root, {
      login: async (emailOrPhone, password) => {
        submittingRef.current = true;
        try {
          return await latest.current.login(emailOrPhone, password);
        } catch (error) {
          submittingRef.current = false;
          throw new Error(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to log in. Please check credentials."
          );
        }
      },
      onSuccess: (user) => latest.current.handleRedirectByRole(user),
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
      root.innerHTML = "";
    };
  }, []);

  // Auto redirect if already logged in
  // Loop guard: if the page we redirect to bounces the user straight back to /login
  // (role not allowed there), skip a second auto-redirect within a short window.
  useEffect(() => {
    if (role && currentUser) {
      if (submittingRef.current) return; // the scene redirects after its success animation
      const now = Date.now();
      if (now - lastAutoRedirectAt < 3000) {
        sceneRef.current?.toast(
          `Your account role (${currentUser?.role || role}) has no page assigned. Please contact an administrator.`
        );
        return;
      }
      lastAutoRedirectAt = now;
      handleRedirectByRole(currentUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, currentUser]);

  return <div ref={hostRef} style={{ position: "fixed", inset: 0 }} />;
}
