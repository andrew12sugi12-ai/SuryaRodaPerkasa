import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/server/services/audit.service";

const ISSUER = "SRP Ledger";

function normalize(token: string) {
  return token.replace(/\s/g, "");
}

// Generate a fresh secret, store it (but keep 2FA OFF until the user proves
// they can produce a valid code), and return a QR image to scan.
export async function startTwoFactor(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const secret = await generateSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });
  const otpauth = await generateURI({
    secret,
    label: user.email,
    issuer: ISSUER,
  });
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return { secret, qrDataUrl };
}

export async function confirmTwoFactor(userId: string, token: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.twoFactorSecret) throw new Error("Start the setup first.");
  const res = await verify({ token: normalize(token), secret: user.twoFactorSecret, epochTolerance: 30 });
  if (!res.valid) throw new Error("That code is not valid. Use the current code from your app.");
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  await logAudit("ENABLE_2FA", { email: user.email }, userId);
}

export async function disableTwoFactor(userId: string, token: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.twoFactorEnabled || !user.twoFactorSecret) throw new Error("2FA is not enabled.");
  const res = await verify({ token: normalize(token), secret: user.twoFactorSecret, epochTolerance: 30 });
  if (!res.valid) throw new Error("That code is not valid.");
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await logAudit("DISABLE_2FA", { email: user.email }, userId);
}
