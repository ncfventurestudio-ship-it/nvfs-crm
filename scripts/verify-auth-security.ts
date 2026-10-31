import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { AuthService } from "../src/services/auth.service";
import { isValidBcryptHash } from "../src/lib/auth";
import { POST as loginRouteHandler } from "../src/app/api/auth/login/route";
import { NextRequest } from "next/server";

async function runSecurityTestSuite() {
  console.log("================================================================================");
  console.log("   AUTOMATED SECURITY VERIFICATION TEST SUITE: UNIVERSAL PASSWORD REMOVAL       ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details = "") {
    if (condition) {
      console.log(` ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(` ❌ [FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  // ── Prepare isolated test bcrypt hashes ──────────────────────────────────────
  const validPassword = "LegitUser@Pass2026!";
  const superAdminPassword = "SuperAdminGenuineKey#2026!";
  const validHash = await bcrypt.hash(validPassword, 10);
  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);

  // Isolated test accounts store
  const mockDatabaseUsers = new Map<string, any>([
    [
      "valid.user@nfvs.internal",
      {
        id: "usr_test_valid",
        email: "valid.user@nfvs.internal",
        passwordHash: validHash,
        isActive: true,
        role: {
          code: "EMPLOYEE",
          name: "Standard Contributor",
          level: 10,
          dataScope: "COMPANY",
          rolePermissions: [{ permission: { code: "self:read" } }],
        },
        employee: {
          id: "emp_test_valid",
          employeeNumber: "NFVS-2026-01-0001",
          firstName: "Valid",
          lastName: "User",
          designation: "Contributor",
          department: { name: "Engineering" },
          organization: { id: "org_nfvs_studio", name: "NFVS Studio", code: "NFVS-STUDIO" },
        },
      },
    ],
    [
      "superadmin@nfvs.internal",
      {
        id: "usr_test_superadmin",
        email: "superadmin@nfvs.internal",
        passwordHash: superAdminHash,
        isActive: true,
        role: {
          code: "SUPER_ADMIN",
          name: "Super Administrator",
          level: 100,
          dataScope: "GLOBAL",
          rolePermissions: [{ permission: { code: "*" } }],
        },
        employee: {
          id: "emp_test_superadmin",
          employeeNumber: "NFVS-SA-001",
          firstName: "Super",
          lastName: "Admin",
          designation: "Chief Superadmin",
          department: { name: "Executive" },
          organization: { id: "org_nfvs_studio", name: "NFVS Studio", code: "NFVS-STUDIO" },
        },
      },
    ],
    [
      "missing.hash@nfvs.internal",
      {
        id: "usr_test_missing_hash",
        email: "missing.hash@nfvs.internal",
        passwordHash: null,
        isActive: true,
        role: {
          code: "EMPLOYEE",
          name: "Standard Contributor",
          level: 10,
          rolePermissions: [],
        },
        employee: null,
      },
    ],
    [
      "malformed.hash@nfvs.internal",
      {
        id: "usr_test_malformed_hash",
        email: "malformed.hash@nfvs.internal",
        passwordHash: "invalid_not_a_bcrypt_hash",
        isActive: true,
        role: {
          code: "EMPLOYEE",
          name: "Standard Contributor",
          level: 10,
          rolePermissions: [],
        },
        employee: null,
      },
    ],
    [
      "inactive.user@nfvs.internal",
      {
        id: "usr_test_inactive",
        email: "inactive.user@nfvs.internal",
        passwordHash: validHash,
        isActive: false,
        role: {
          code: "EMPLOYEE",
          name: "Standard Contributor",
          level: 10,
          rolePermissions: [],
        },
        employee: null,
      },
    ],
  ]);

  // Hook db.user.findUnique with test fixture lookup
  const originalFindUnique = db.user.findUnique;
  const originalUpdate = db.user.update;
  let simulateDbUnavailable = false;

  db.user.update = (async (args: any) => {
    if (simulateDbUnavailable) throw new Error("Database offline");
    return { id: args?.where?.id, lastLoginAt: new Date() };
  }) as any;

  db.user.findUnique = (async (args: any) => {
    if (simulateDbUnavailable) {
      throw new Error("Connection pool timeout / Database cluster offline");
    }
    const email = args?.where?.email;
    if (mockDatabaseUsers.has(email)) {
      return mockDatabaseUsers.get(email);
    }
    return null;
  }) as any;

  try {
    // ── TEST 1: Correct password + correct email → login succeeds ────────────────
    const user1 = await AuthService.verifyCredentials("valid.user@nfvs.internal", validPassword);
    assert(
      user1 !== null && user1.email === "valid.user@nfvs.internal" && user1.roleCode === "EMPLOYEE",
      "Test 1: Correct password + correct email -> login succeeds",
      `Expected user object, got ${JSON.stringify(user1)}`
    );

    // ── TEST 2: Incorrect password → HTTP 401 / null ────────────────────────────
    const user2 = await AuthService.verifyCredentials("valid.user@nfvs.internal", "WrongPassword!999");
    assert(
      user2 === null,
      "Test 2: Incorrect password -> rejected (returns null)",
      `Expected null, got ${JSON.stringify(user2)}`
    );

    // Also verify via HTTP login route handler
    const req2 = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "valid.user@nfvs.internal", password: "WrongPassword!999" }),
    });
    const res2 = await loginRouteHandler(req2);
    const json2 = await res2.json();
    assert(
      res2.status === 401 && json2.success === false && json2.error?.code === "INVALID_CREDENTIALS",
      "Test 2 (HTTP): Incorrect password -> HTTP 401 INVALID_CREDENTIALS",
      `Expected HTTP 401, got ${res2.status}`
    );

    // ── TEST 3: Universal password + unrelated account → HTTP 401 ────────────────
    const universalPasswords = [
      "Admin@123",
      "admin@123",
      "Admin123",
      "admin123",
      "Enterprise@2026",
      "enterprise@2026",
      "password",
      "123456",
      "sayalikale@123",
      "Nfventurestudio@123",
    ];

    let allUniversalBlocked = true;
    for (const pwd of universalPasswords) {
      const u = await AuthService.verifyCredentials("valid.user@nfvs.internal", pwd);
      if (u !== null) {
        allUniversalBlocked = false;
        console.error(`VULNERABILITY DETECTED: Universal password "${pwd}" bypassed authentication!`);
        break;
      }
    }
    assert(
      allUniversalBlocked,
      "Test 3: Universal passwords + unrelated account -> HTTP 401 / rejected (all 10 bypass attempts blocked)",
      "One or more universal master passwords successfully bypassed verification!"
    );

    // ── TEST 4: Universal password + Super Admin account → HTTP 401 ──────────────
    let superAdminUniversalBlocked = true;
    for (const pwd of universalPasswords) {
      const sa = await AuthService.verifyCredentials("superadmin@nfvs.internal", pwd);
      if (sa !== null) {
        superAdminUniversalBlocked = false;
        console.error(`VULNERABILITY DETECTED: Super Admin account breached with "${pwd}"!`);
        break;
      }
    }
    // And verify genuine password still works for Super Admin
    const genuineSa = await AuthService.verifyCredentials("superadmin@nfvs.internal", superAdminPassword);
    assert(
      superAdminUniversalBlocked && genuineSa !== null && genuineSa.roleCode === "SUPER_ADMIN",
      "Test 4: Universal passwords + Super Admin account -> rejected (genuine password succeeds)",
      "Super Admin account allowed universal bypass or rejected genuine password"
    );

    // ── TEST 5: Missing password hash → login rejected ───────────────────────────
    const user5 = await AuthService.verifyCredentials("missing.hash@nfvs.internal", "AnyPassword@123");
    assert(
      user5 === null,
      "Test 5: Missing password hash -> login rejected safely",
      `Expected null, got ${JSON.stringify(user5)}`
    );

    // ── TEST 6: Malformed password hash → login rejected safely ──────────────────
    const user6 = await AuthService.verifyCredentials("malformed.hash@nfvs.internal", "AnyPassword@123");
    assert(
      user6 === null,
      "Test 6: Malformed password hash -> login rejected safely without exception",
      `Expected null, got ${JSON.stringify(user6)}`
    );

    // ── TEST 7: Inactive account → login rejected ────────────────────────────────
    const user7 = await AuthService.verifyCredentials("inactive.user@nfvs.internal", validPassword);
    assert(
      user7 === null,
      "Test 7: Inactive account -> login rejected",
      `Expected null, got ${JSON.stringify(user7)}`
    );

    // ── TEST 8: Unknown email → generic authentication failure ───────────────────
    const user8 = await AuthService.verifyCredentials("nonexistent.unknown@nfvs.internal", validPassword);
    const req8 = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent.unknown@nfvs.internal", password: validPassword }),
    });
    const res8 = await loginRouteHandler(req8);
    const json8 = await res8.json();
    assert(
      user8 === null &&
        res8.status === 401 &&
        json8.error?.message === "Invalid corporate email or password",
      "Test 8: Unknown email -> generic authentication failure without email enumeration",
      `Expected generic 401 failure, got HTTP ${res8.status} with message: ${json8.error?.message}`
    );

    // ── TEST 9: Existing valid bcrypt account → login continues working ──────────
    const user9 = await AuthService.verifyCredentials("valid.user@nfvs.internal", validPassword);
    assert(
      user9 !== null && user9.id === "usr_test_valid" && user9.permissions.includes("self:read"),
      "Test 9: Existing valid bcrypt account -> login continues working with trusted DB permissions",
      "Failed to authenticate existing bcrypt account"
    );

    // ── TEST 10: Database unavailable → login fails securely; no offline bypass ──
    simulateDbUnavailable = true;
    let dbDownMasterBypassDetected = false;
    for (const pwd of universalPasswords) {
      const offlineBypass = await AuthService.verifyCredentials("superadmin@nfvs.internal", pwd);
      if (offlineBypass !== null) {
        dbDownMasterBypassDetected = true;
        break;
      }
    }
    const dbDownNormal = await AuthService.verifyCredentials("valid.user@nfvs.internal", validPassword);
    simulateDbUnavailable = false;

    assert(
      !dbDownMasterBypassDetected && dbDownNormal === null,
      "Test 10: Database unavailable -> login fails securely; no offline master-password bypass",
      "Offline master password bypass succeeded while database was down!"
    );

    // ── TEST 11: Production environment → no test credentials or defaults accepted ─
    const prevNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = "production";

    simulateDbUnavailable = true;
    const prodBypassAttempt = await AuthService.verifyCredentials("admin", "Admin@123");
    const prodBypassAttempt2 = await AuthService.verifyCredentials("coo@nfvs.in", "Admin@123");
    simulateDbUnavailable = false;
    (process.env as any).NODE_ENV = prevNodeEnv;

    assert(
      prodBypassAttempt === null && prodBypassAttempt2 === null,
      "Test 11: Production environment -> no test credentials or default credentials accepted",
      "Production environment allowed offline or default credentials!"
    );

    // ── TEST 12: API responses → no plaintext password or password hash exposed ──
    const authenticatedUser = await AuthService.verifyCredentials("valid.user@nfvs.internal", validPassword);
    const authUserJson = JSON.stringify(authenticatedUser);

    const leaksPasswordHash =
      authUserJson.includes("passwordHash") ||
      authUserJson.includes("$2a$") ||
      authUserJson.includes("$2b$");

    const leaksLoginPassword =
      authUserJson.includes("loginPassword") ||
      authUserJson.includes(validPassword);

    // Verify hash validator utility correctly differentiates hashes
    const isStandardHash = isValidBcryptHash(validHash);
    const isMalformedRejected =
      !isValidBcryptHash("not_a_bcrypt_hash") &&
      !isValidBcryptHash(null) &&
      !isValidBcryptHash("") &&
      !isValidBcryptHash("Admin@123");

    assert(
      authenticatedUser !== null &&
        !leaksPasswordHash &&
        !leaksLoginPassword &&
        isStandardHash &&
        isMalformedRejected,
      "Test 12: API responses -> no plaintext password or password hash exposed",
      `Leaked credentials in response payload: ${authUserJson}`
    );
  } finally {
    // Restore findUnique & update
    db.user.findUnique = originalFindUnique;
    db.user.update = originalUpdate;
  }

  console.log("\n================================================================================");
  console.log(`SECURITY TEST SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTestSuite().catch((err) => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});
