import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Simple .env reader fallback
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function testConnection() {
  console.log("--------------------------------------------------");
  console.log("Checking Outbound SMTP Configuration from .env...");
  console.log("SMTP_HOST:      ", process.env.SMTP_HOST || "(empty)");
  console.log("SMTP_PORT:      ", process.env.SMTP_PORT || "587");
  console.log("SMTP_SECURE:    ", process.env.SMTP_SECURE || "false");
  console.log("SMTP_USER:      ", process.env.SMTP_USER || "(empty)");
  console.log("SMTP_PASS:      ", process.env.SMTP_PASS ? "●●●●●●●● (provided)" : "(empty)");
  console.log("SMTP_FROM_EMAIL:", process.env.SMTP_FROM_EMAIL || "(empty)");
  console.log("LOGIN_PORTAL_URL:", (process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app") + "/login");
  console.log("--------------------------------------------------");

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("\n⚠️  SMTP configuration is incomplete in .env:");
    if (!process.env.SMTP_HOST) console.log("   - SMTP_HOST is empty (for Gmail, set to: smtp.gmail.com)");
    if (!process.env.SMTP_USER) console.log("   - SMTP_USER is empty (enter your Gmail address)");
    if (!process.env.SMTP_PASS) console.log("   - SMTP_PASS is empty (enter your 16-character Google App Password)");
    console.log("\nPlease paste your details into .env and save the file (Ctrl+S), then run this test again.");
    process.exit(1);
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log("\nConnecting to SMTP server at " + process.env.SMTP_HOST + "...");
    await transporter.verify();
    console.log("\n🎉 SUCCESS! SMTP Server connection verified successfully.");
    console.log("Your CRM is fully authorized to send automated welcome emails!");
  } catch (error: any) {
    console.error("\n❌ FAILED to connect to SMTP server:");
    console.error(error.message);
    console.log("\nTroubleshooting tips for Gmail:");
    console.log("1. Ensure SMTP_HOST is 'smtp.gmail.com'");
    console.log("2. Ensure SMTP_USER is your full Gmail address (e.g. name@gmail.com)");
    console.log("3. Ensure SMTP_PASS is the 16-character App Password (without spaces)");
    console.log("4. Ensure 2-Step Verification is enabled on your Google account.");
    process.exit(1);
  }
}

testConnection();
