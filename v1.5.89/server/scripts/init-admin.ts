/**
 * One-off script to create or promote a super-admin account (email + password login).
 *
 * Usage (run on the server after deploy):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourStrongPass ADMIN_NAME="管理员" \
 *     pnpm tsx scripts/init-admin.ts
 *
 * Safe to run multiple times: it upserts the user, (re)sets the password,
 * and ensures role = "admin".
 */
import bcrypt from "bcryptjs";
import * as db from "../server/db";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || (email ? email.split("@")[0] : "管理员");

  if (!email || !password) {
    console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD env.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const openId = `email_${email}`;
  const passwordHash = await bcrypt.hash(password, 8);

  await db.upsertUser({
    openId,
    email,
    name,
    role: "admin",
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  await db.setUserPasswordHash(openId, passwordHash);

  const user = await db.getUserByOpenId(openId);
  console.log("Super admin ready:", {
    id: user?.id,
    email: user?.email,
    name: user?.name,
    role: user?.role,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error("init-admin failed:", err);
  process.exit(1);
});
