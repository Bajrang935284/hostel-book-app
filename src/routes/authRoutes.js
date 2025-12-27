import express from "express";
import {
  refreshAccessToken,
  logout,
  logoutAll,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Rotate refresh token and return new access token + refresh token
router.post("/refresh", refreshAccessToken);

// Logout current device (revoke provided refresh token)
router.post("/logout", logout);

// Logout all devices for authenticated user
router.post("/logout-all", authenticate, logoutAll);

export default router;
