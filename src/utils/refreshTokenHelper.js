import crypto from "crypto";
import { prisma } from "../config/database.js";

const createTokenHash = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateRefreshToken = async (
  userId,
  userRole,
  deviceInfo = null,
  expiresInDays = 30
) => {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = createTokenHash(rawToken);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const record = await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      userRole,
      deviceInfo,
      expiresAt,
    },
  });

  return { rawToken, record };
};

export const findValidTokenByRaw = async (rawToken) => {
  const tokenHash = createTokenHash(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return null;
  if (record.revoked) return null;
  if (new Date(record.expiresAt) <= new Date()) return null;
  return record;
};

export const revokeTokenById = async (id) => {
  return prisma.refreshToken.update({ where: { id }, data: { revoked: true } });
};

export const revokeTokenByHash = async (rawToken) => {
  const tokenHash = createTokenHash(rawToken);
  return prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
};

export const revokeAllTokensForUser = async (userId) => {
  return prisma.refreshToken.updateMany({
    where: { userId },
    data: { revoked: true },
  });
};

export default {
  generateRefreshToken,
  findValidTokenByRaw,
  revokeTokenById,
  revokeAllTokensForUser,
};
