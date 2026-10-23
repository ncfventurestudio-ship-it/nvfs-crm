import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// 1. Load .env manually to ensure all values are present
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
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

const results = {
  env: {},
  database: {},
  email: {},
  stats: {}
};

async function runDiagnostics() {
  console.log("=================================================");
  console.log("   NFVS CRM SYSTEM DIAGNOSTICS & HEALTH CHECK    ");
  console.log("=================================================");

  // Step 1: Environment Variables Check
  console.log("\n[1/4] Checking Environment Configuration...");
  const dbUrl = process.env.DATABASE_URL || "";
  const directUrl = process.env.DIRECT_URL || "";
  const sessionSecret = process.env.SESSION_SECRET || "";
  const smtpHost = process.env.SMTP_HOST || "";
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const mask = (str, show = 4) => {
    if (!str) return "(not set)";
    if (str.length <= show * 2) return "********";
    return str.slice(0, show) + "..." + str.slice(-show);
  };

  console.log(` - DATABASE_URL: ${dbUrl ? "Configured (" + mask(dbUrl, 15) + ")" : "MISSING"}`);
  console.log(` - DIRECT_URL:   ${directUrl ? "Configured (" + mask(directUrl, 15) + ")" : "MISSING"}`);
  console.log(` - SESSION_SECRET: ${sessionSecret ? "Configured (length: " + sessionSecret.length + ")" : "MISSING"}`);
  console.log(` - NEXT_PUBLIC_APP_URL: ${appUrl || "(not set)"}`);
  console.log(` - SMTP_HOST:    ${smtpHost || "(not set)"}`);
  console.log(` - SMTP_USER:    ${smtpUser || "(not set)"}`);
  console.log(` - SMTP_PASS:    ${smtpPass ? "Configured (length: " + smtpPass.length + ")" : "(not set)"}`);

  results.env = {
    hasDatabaseUrl: Boolean(dbUrl),
    hasDirectUrl: Boolean(directUrl),
    hasSessionSecret: Boolean(sessionSecret),
    hasSmtp: Boolean(smtpHost && smtpUser && smtpPass)
  };

  // Step 2: Database Connectivity Check
  console.log("\n[2/4] Testing Database Connection (Supabase PostgreSQL via Prisma)...");
  const prisma = new PrismaClient();
  const startTime = Date.now();

  try {
    const rawResult = await prisma.$queryRaw`SELECT NOW() as current_time, current_database() as database_name, current_user as db_user, version() as pg_version;`;
    const latency = Date.now() - startTime;
    console.log(` ✅ SUCCESS: Connected to PostgreSQL in ${latency}ms!`);
    console.log(`    - Database: ${rawResult[0].database_name}`);
    console.log(`    - Current User: ${rawResult[0].db_user}`);
    console.log(`    - Server Timestamp: ${rawResult[0].current_time}`);
    const versionSnippet = (rawResult[0].pg_version || "").split("\n")[0].slice(0, 70);
    console.log(`    - Engine: ${versionSnippet}...`);

    results.database = {
      connected: true,
      latencyMs: latency,
      database: rawResult[0].database_name,
      user: rawResult[0].db_user,
      serverTime: rawResult[0].current_time,
      version: versionSnippet
    };

    // Step 3: Record counts across core tables
    console.log("\n[3/4] Inspecting Database Tables & Core Records...");
    const counts = {};
    const models = [
      "organization",
      "user",
      "employee",
      "role",
      "department",
      "permission",
      "lead",
      "project",
      "task",
      "invoice",
      "attendance",
      "leaveRequest",
      "jobPosting",
      "candidate",
      "payrollRecord"
    ];

    for (const m of models) {
      if (prisma[m] && typeof prisma[m].count === "function") {
        try {
          counts[m] = await prisma[m].count();
        } catch (err) {
          counts[m] = `Error: ${err.message}`;
        }
      }
    }

    results.stats = counts;
    for (const [key, val] of Object.entries(counts)) {
      console.log(`    • ${key.padEnd(16)} : ${val}`);
    }

    // Inspect organizations
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, code: true, status: true, _count: { select: { employees: true, departments: true } } }
    });
    console.log(`\n    Organizations found (${orgs.length}):`);
    for (const o of orgs) {
      console.log(`      - [${o.code}] "${o.name}" (Status: ${o.status}, Employees: ${o._count.employees}, Depts: ${o._count.departments})`);
    }

    // Inspect users summary by role
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: { select: { name: true } }
      },
      take: 5
    });
    console.log(`\n    Sample Users (First 5 of ${counts.user || 0}):`);
    for (const u of users) {
      console.log(`      - ${u.email} | Name: ${u.name || "N/A"} | Role: ${u.role?.name || "None"} | Status: ${u.status}`);
    }

  } catch (dbError) {
    console.error(` ❌ ERROR: Database connection failed!`);
    console.error(`    Details: ${dbError.message}`);
    results.database = {
      connected: false,
      error: dbError.message
    };
  } finally {
    await prisma.$disconnect();
  }

  // Step 4: SMTP Email Connectivity Check
  console.log("\n[4/4] Testing Outbound SMTP Email Connection...");
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(" ⚠️  SMTP is not fully configured (missing host, user, or pass).");
    results.email = { configured: false, tested: false, note: "Missing credentials" };
  } else {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === "true" || port === 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass.replace(/\s+/g, ""), // Gmail app passwords may have spaces
        },
      });

      const emailStart = Date.now();
      await transporter.verify();
      const emailLatency = Date.now() - emailStart;
      console.log(` ✅ SUCCESS: SMTP Server (${smtpHost}:${port}) authenticated successfully in ${emailLatency}ms!`);
      results.email = { configured: true, connected: true, latencyMs: emailLatency, host: smtpHost, port };
    } catch (mailError) {
      console.error(` ❌ SMTP ERROR: Could not connect / authenticate with SMTP server:`);
      console.error(`    ${mailError.message}`);
      results.email = { configured: true, connected: false, error: mailError.message };
    }
  }

  console.log("\n=================================================");
  console.log("               DIAGNOSTIC SUMMARY                ");
  console.log("=================================================");
  console.log(`Database Status: ${results.database.connected ? "ONLINE ✅" : "OFFLINE ❌"}`);
  console.log(`Email Service:   ${results.email.connected ? "ONLINE ✅" : (results.email.configured ? "FAILED ❌" : "NOT CONFIGURED ⚠️")}`);
  console.log("=================================================\n");
}

runDiagnostics().catch(console.error);
