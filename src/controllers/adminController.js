import { prisma } from "../config/database.js";
import { comparePassword } from "../utils/passwordHelper.js";
import { generateToken } from "../utils/jwtHelper.js";
import { generateRefreshToken } from "../utils/refreshTokenHelper.js";

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const isPasswordValid = await comparePassword(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = generateToken({
      id: admin.id,
      role: "admin",
    });

    const { rawToken: refreshToken } = await generateRefreshToken(
      admin.id,
      "admin"
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        refreshToken,
        user: {
          id: admin.id,
          username: admin.username,
          role: "admin",
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
    });
  }
};
