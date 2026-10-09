const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate, optionalAuthenticate } = require("../middleware/auth.middleware");
const { loginValidator, refreshTokenValidator } = require("../validators/auth.validator");
const rateLimit = require("express-rate-limit");

// Login rate limiter: max 30 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 15 minutes",
    code: "TOO_MANY_REQUESTS",
  },
});

// Password recovery rate limiter: max 5 requests per 15 minutes per IP to prevent email spam / enumeration
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset requests from this IP. Please try again after 15 minutes.",
    code: "TOO_MANY_REQUESTS",
  },
});

// Password submission rate limiter: max 10 attempts per 15 minutes per IP
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password change attempts. Please try again after 15 minutes.",
    code: "TOO_MANY_REQUESTS",
  },
});

router.post("/login", loginLimiter, loginValidator, authController.login);
router.post("/logout", optionalAuthenticate, authController.logout);
router.post("/refresh", refreshTokenValidator, authController.refreshToken);
router.get("/me", authenticate, authController.getMe);
router.post("/forgot-password", passwordResetLimiter, authController.sendResetEmail);
router.post("/send-reset-email", passwordResetLimiter, authController.sendResetEmail);
router.post("/reset-password", passwordChangeLimiter, authController.resetPassword);

module.exports = router;
