const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate, optionalAuthenticate } = require("../middleware/auth.middleware");
const { loginValidator, refreshTokenValidator } = require("../validators/auth.validator");
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 login requests per windowMs
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  },
});

router.post("/login", loginLimiter, loginValidator, authController.login);
router.post("/logout", optionalAuthenticate, authController.logout);
router.post("/refresh", refreshTokenValidator, authController.refreshToken);
router.get("/me", authenticate, authController.getMe);
router.post("/forgot-password", authController.sendResetEmail);
router.post("/send-reset-email", authController.sendResetEmail);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
