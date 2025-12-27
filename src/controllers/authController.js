import { generateToken } from "../utils/jwtHelper.js";
import {
  generateRefreshToken,
  findValidTokenByRaw,
  revokeTokenById,
  revokeTokenByHash,
  revokeAllTokensForUser,
} from "../utils/refreshTokenHelper.js";
import { prisma } from "../config/database.js";

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required." });
    }

    const existing = await findValidTokenByRaw(refreshToken);
    if (!existing) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }

    // Rotation: revoke old token and create new one
    await revokeTokenById(existing.id);

    const { rawToken: newRefreshToken, record: created } =
      await generateRefreshToken(
        existing.userId,
        existing.userRole,
        existing.deviceInfo
      );

    // link replacement
    await prisma.refreshToken.update({
      where: { id: created.id },
      data: { replacedBy: null },
    });

    const accessToken = generateToken({
      id: existing.userId,
      role: existing.userRole,
    });

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to refresh token." });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required." });
    }

    await revokeTokenByHash(refreshToken);
    res.json({ success: true, message: "Logged out from device." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Logout failed." });
  }
};

export const logoutAll = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    await revokeAllTokensForUser(user.id);
    res.json({ success: true, message: "Logged out from all devices." });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ success: false, message: "Logout all failed." });
  }
};
