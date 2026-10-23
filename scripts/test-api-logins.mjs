async function testLiveLogins() {
  console.log("=================================================");
  console.log("   LIVE HTTP LOGIN VERIFICATION (localhost:3000) ");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  const testCases = [
    // 1. The exact failure from the user's screenshot
    { email: "coo@nfvs.in", password: "Admin@123", expectedRole: "COO", desc: "User Screenshot: coo@nfvs.in" },
    
    // 2. Other NFVS personas from the credential sheet
    { email: "superadmin@nfvs.in", password: "Admin@123", expectedRole: "SUPER_ADMIN", desc: "NFVS Super Admin" },
    { email: "admin@nfvs.in", password: "Admin@123", expectedRole: "ADMIN", desc: "NFVS Admin" },
    { email: "ceo@nfvs.in", password: "Admin@123", expectedRole: "CEO", desc: "NFVS CEO" },
    { email: "hr@nfvs.in", password: "Admin@123", expectedRole: "HR", desc: "NFVS HR" },
    { email: "cfo@nfvs.in", password: "Admin@123", expectedRole: "CFO", desc: "NFVS CFO" },
    { email: "cto@nfvs.in", password: "Admin@123", expectedRole: "CTO", desc: "NFVS CTO" },
    { email: "employee@nfvs.in", password: "Admin@123", expectedRole: "EMPLOYEE", desc: "NFVS Staff Employee" },

    // 3. Naree Foundation personas
    { email: "coo@nf.in", password: "Admin@123", expectedRole: "COO", desc: "Naree Foundation COO" },
    { email: "hr@nf.in", password: "Admin@123", expectedRole: "HR", desc: "Naree Foundation HR" },

    // 4. Employees created through HR panel
    { email: "atharvnarawade@gmail.com", password: "Admin@123", expectedRole: "EMPLOYEE", desc: "HR Created: Atharva Narawade" },
    { email: "prasadpilke23@gmail.com", password: "Admin@123", expectedRole: "EMPLOYEE", desc: "HR Created: Prasad Pilke" },
    { email: "priya.kulkarni@nfvs.in", password: "Admin@123", expectedRole: "EMPLOYEE", desc: "HR Created: Priya Kulkarni" },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tc.email, password: tc.password }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        const u = json.data;
        console.log(`✅ [PASS] ${tc.desc} (${tc.email}): Logged in as ${u.roleCode} -> target: ${u.targetDashboard}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${tc.desc} (${tc.email}): HTTP ${res.status} - ${json.error?.message || JSON.stringify(json)}`);
        failed++;
      }
    } catch (e) {
      console.error(`❌ [ERROR] ${tc.desc} (${tc.email}): ${e.message}`);
      failed++;
    }
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED (Total: ${testCases.length})`);
  console.log("=================================================");

  if (failed > 0) process.exit(1);
}

testLiveLogins().catch(console.error);
