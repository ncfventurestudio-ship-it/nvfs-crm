import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

// ─── Environment Isolation Check ──────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  console.error("FATAL: Seed scripts with default test credentials must NEVER run in production!");
  process.exit(1);
}

// ─── Isolated Test-Only Seed Password ─────────────────────────────────────────
// This is strictly used to seed local development/test fixtures and must never be used in production.
const SEED_TEST_PASSWORD = process.env.TEST_SEED_PASSWORD || "TestAccount@2026!";

// ─── Domain mapping ───────────────────────────────────────────────────────────
// NFVS → @nfvs.in  |  NAREE → @nf.in
const ORG_DOMAINS = {
  NFVS:  "nfvs.in",
  NAREE: "nf.in",
};

// ─── Per-company role personas ─────────────────────────────────────────────────
const PERSONAS = [
  { roleCode: "SUPER_ADMIN",     emailPrefix: "superadmin",  designation: "Platform Super Administrator",       deptCode: "EXEC" },
  { roleCode: "ADMIN",           emailPrefix: "admin",        designation: "Platform Administrator",            deptCode: "EXEC" },
  { roleCode: "CEO",             emailPrefix: "ceo",          designation: "Chief Executive Officer",           deptCode: "EXEC" },
  { roleCode: "HR",              emailPrefix: "hr",           designation: "Chief Human Resources Officer",     deptCode: "HR"   },
  { roleCode: "COO",             emailPrefix: "coo",          designation: "Chief Operating Officer",           deptCode: "OPS"  },
  { roleCode: "CFO",             emailPrefix: "cfo",          designation: "Chief Financial Officer",           deptCode: "FIN"  },
  { roleCode: "CIO",             emailPrefix: "cio",          designation: "Chief Information Officer",         deptCode: "INTL" },
  { roleCode: "CMO",             emailPrefix: "cmo",          designation: "Chief Marketing Officer",           deptCode: "MKT"  },
  { roleCode: "CTO",             emailPrefix: "cto",          designation: "Chief Technology Officer",          deptCode: "EXEC" },
  { roleCode: "DEPARTMENT_HEAD", emailPrefix: "depthead",     designation: "Department Head",                   deptCode: "OPS"  },
  { roleCode: "MANAGER",         emailPrefix: "manager",      designation: "Team Manager",                      deptCode: "HR"   },
  { roleCode: "TEAM_LEAD",       emailPrefix: "teamlead",     designation: "Team Lead",                         deptCode: "HR"   },
  { roleCode: "EMPLOYEE",        emailPrefix: "employee",     designation: "Staff Contributor",                 deptCode: "HR"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDept(depts, code) {
  return depts.find((d) => d.code === code) || depts[0];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("================================================================================");
  console.log("  PURGING ALL OLD ACCOUNTS & SEEDING FRESH ROLE-BASED LOGIN CREDENTIALS");
  console.log("================================================================================\n");

  const hashedPassword = await bcrypt.hash(SEED_TEST_PASSWORD, 10);

  // ── 1. Fetch organizations ──────────────────────────────────────────────────
  const orgs = await prisma.organization.findMany();
  const orgMap = {};
  orgs.forEach((o) => { orgMap[o.code] = o; });

  const nfvs  = orgMap["NFVS"];
  const naree = orgMap["NAREE"];

  if (!nfvs || !naree) {
    throw new Error("Both NFVS and NAREE organizations must exist in the database.");
  }

  // ── 2. Fetch roles ──────────────────────────────────────────────────────────
  const roles = await prisma.role.findMany();
  const roleMap = {};
  roles.forEach((r) => { roleMap[r.code] = r; });

  // ── 3. Fetch departments per org ────────────────────────────────────────────
  const nfvsDepts  = await prisma.department.findMany({ where: { organizationId: nfvs.id  } });
  const nareeDepts = await prisma.department.findMany({ where: { organizationId: naree.id } });

  // ── 4. Purge all existing users/employees cleanly ───────────────────────────
  console.log("Step 1 — Purging all existing accounts...\n");

  await prisma.employee.updateMany({ data: { managerId: null } });

  const cascadeTables = [
    "notification", "taskComment", "task",
    "leaveRequest", "leaveBalance", "attendanceRecord",
    "onDutyAssignment", "employeeRequest", "payrollEntry",
    "employeeSalaryStructure", "userCompanyMembership",
    "calendarEvent", "aIConversation", "aIUsageLog", "auditLog",
    "operationIssueComment", "operationIssue", "operationEmployee",
    "operationActivity", "approvalRequest", "approvalStep",
    "message", "conversationParticipant", "conversation",
  ];

  for (const table of cascadeTables) {
    if (prisma[table] && typeof prisma[table].deleteMany === "function") {
      try { await prisma[table].deleteMany({}); } catch (_) {}
    }
  }

  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("  ✓ All old users and employees purged.\n");

  // ── 5. Seed per-company accounts ────────────────────────────────────────────
  console.log("Step 2 — Creating fresh role-based accounts...\n");

  const seededList = [];

  for (const [orgCode, org] of [[nfvs.code, nfvs], [naree.code, naree]]) {
    const domain = ORG_DOMAINS[orgCode];
    const depts  = orgCode === "NFVS" ? nfvsDepts : nareeDepts;

    console.log(`--- ${org.name} (${orgCode}) → @${domain} ---`);

    for (const persona of PERSONAS) {
      const role = roleMap[persona.roleCode];
      if (!role) {
        console.warn(`  ⚠ Role ${persona.roleCode} not found, skipping.`);
        continue;
      }

      const email = `${persona.emailPrefix}@${domain}`;

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          roleId: role.id,
          isActive: true,
        },
      });

      // Create employee
      const dept = getDept(depts, persona.deptCode);
      const firstName = capitalize(persona.emailPrefix);

      await prisma.employee.create({
        data: {
          userId:           user.id,
          organizationId:   org.id,
          departmentId:     dept.id,
          employeeNumber:   `${orgCode}-${persona.roleCode.replace("_", "")}-001`,
          firstName,
          lastName:         `(${orgCode})`,
          email,
          designation:      persona.designation,
          hireDate:         new Date(),
          employmentStatus: "ACTIVE",
          employmentType:   "FULL_TIME",
          workMode:         "HYBRID",
          location:         "Headquarters",
        },
      });

      // Membership
      await prisma.userCompanyMembership.create({
        data: {
          userId:         user.id,
          organizationId: org.id,
          roleId:         role.id,
          isPrimary:      true,
          status:         "ACTIVE",
        },
      });

      seededList.push({
        org:    `${orgCode} (${org.name})`,
        role:   role.code,
        email,
        password: SEED_TEST_PASSWORD,
      });

      console.log(`  ✓ [${role.code.padEnd(15)}] ${email}`);
    }

    console.log();
  }

  // ── 6. Print credentials table ──────────────────────────────────────────────
  console.log("================================================================================");
  console.log("  TEST CREDENTIALS (DEVELOPMENT FIXTURE ONLY)");
  console.log("================================================================================\n");

  const nfvsRows  = seededList.filter((r) => r.org.startsWith("NFVS"));
  const nareeRows = seededList.filter((r) => r.org.startsWith("NAREE"));

  console.log("--- Naree Foundation Venture Studio (@nfvs.in) ---");
  nfvsRows.forEach((r) =>
    console.log(`  ${r.role.padEnd(16)} | ${r.email.padEnd(28)} | ${r.password}`)
  );

  console.log("\n--- Naree Foundation (@nf.in) ---");
  nareeRows.forEach((r) =>
    console.log(`  ${r.role.padEnd(16)} | ${r.email.padEnd(28)} | ${r.password}`)
  );

  console.log(`\n  Seeded Test Password: ${SEED_TEST_PASSWORD}`);
  console.log(`  Total accounts created: ${seededList.length}`);
  console.log("================================================================================");
  console.log("  DONE!");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
