import { db } from "./db";

export interface RegisteredEmployee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeNumber: string;
  email: string;
  designation: string;
  departmentName: string;
  organizationId: "org_nfvs_studio" | "org_naree_foundation" | "org_nfvs_corp";
  companyCode: "NFVS-STUDIO" | "NAREE" | "NFVS-CORP";
  companyName: string;
  designatedHrEmail: string;
  phone?: string;
  isActive: boolean;
}

// Authoritative corporate workforce registry for active employees across both companies
const REGISTERED_WORKFORCE: RegisteredEmployee[] = [
  // =========================================================================
  // COMPANY A: NAREE FOUNDATION VENTURE STUDIO (NFVS)
  // =========================================================================
  {
    id: "emp_nfvs_gouri_029",
    firstName: "Gouri",
    lastName: "Jadhav",
    fullName: "Gouri Jadhav",
    employeeNumber: "NFVS-ENG-029",
    email: "gourisjadhav2006@gmail.com",
    designation: "Software Development Engineer",
    departmentName: "Engineering & Innovation Hub",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },
  {
    id: "emp_nfvs_rahul_042",
    firstName: "Rahul",
    lastName: "Sharma",
    fullName: "Rahul Sharma",
    employeeNumber: "NFVS-ENG-042",
    email: "rahul.sharma@nfvs.in",
    designation: "Senior Frontend Engineer",
    departmentName: "Engineering & Studio Operations",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },
  {
    id: "emp_hr_01",
    firstName: "Sayali",
    lastName: "Kale",
    fullName: "Sayali Kale",
    employeeNumber: "NFVS-HR-001",
    email: "hr@nfvs.in",
    designation: "HR Operations Lead",
    departmentName: "Human Capital & People Operations",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },
  {
    id: "emp_superadmin_01",
    firstName: "Marcus",
    lastName: "Vance",
    fullName: "Marcus Vance",
    employeeNumber: "NFVS-0001",
    email: "superadmin@nfvs.internal",
    designation: "Principal Enterprise Architect & Super Admin",
    departmentName: "Executive Governance",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },
  {
    id: "emp_nfvs_0002",
    firstName: "Arthur",
    lastName: "Pendelton",
    fullName: "Arthur Pendelton",
    employeeNumber: "NFVS-0002",
    email: "chairperson@nfvs.internal",
    designation: "Chairperson of the Board",
    departmentName: "Executive Board",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },
  {
    id: "emp_nfvs_0003",
    firstName: "Elena",
    lastName: "Rostova",
    fullName: "Elena Rostova",
    employeeNumber: "NFVS-0003",
    email: "ceo@nfvs.internal",
    designation: "Chief Executive Officer",
    departmentName: "Executive Leadership",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },
  {
    id: "emp_nfvs_0004",
    firstName: "David",
    lastName: "Chen",
    fullName: "David Chen",
    employeeNumber: "NFVS-0004",
    email: "cto@nfvs.internal",
    designation: "Chief Technology Officer",
    departmentName: "Engineering & Innovation",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },
  {
    id: "emp_nfvs_0008",
    firstName: "Alex",
    lastName: "Mercer",
    fullName: "Alex Mercer",
    employeeNumber: "NFVS-0008",
    email: "alex.mercer@nfvs.internal",
    designation: "Senior Staff Systems Engineer",
    departmentName: "Cloud Infrastructure",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    designatedHrEmail: "hr@nfvs.in",
    isActive: true,
  },

  // =========================================================================
  // COMPANY B: NAREE FOUNDATION (NAREE)
  // =========================================================================
  {
    id: "emp_hr_naree_01",
    firstName: "Pooja",
    lastName: "Sharma",
    fullName: "Pooja Sharma",
    employeeNumber: "NF-HR-001",
    email: "hr@nf.in",
    designation: "HR Operations Officer",
    departmentName: "Human Capital & Social Impact",
    organizationId: "org_naree_foundation",
    companyCode: "NAREE",
    companyName: "Naree Foundation",
    designatedHrEmail: "hr@nf.in",
    isActive: true,
  },
  {
    id: "emp_naree_field_108",
    firstName: "Anjali",
    lastName: "Deshmukh",
    fullName: "Anjali Deshmukh",
    employeeNumber: "NF-FIELD-108",
    email: "anjali.deshmukh@nareefoundation.org",
    designation: "Outreach Program Coordinator",
    departmentName: "Community Welfare & Field Programs",
    organizationId: "org_naree_foundation",
    companyCode: "NAREE",
    companyName: "Naree Foundation",
    designatedHrEmail: "hr@naree.internal",
    isActive: true,
  },
  {
    id: "emp_naree_0001",
    firstName: "Sunita",
    lastName: "Patel",
    fullName: "Sunita Patel",
    employeeNumber: "NF-0001",
    email: "sunita.patel@nareefoundation.org",
    designation: "Social Welfare Supervisor",
    departmentName: "Community Programs",
    organizationId: "org_naree_foundation",
    companyCode: "NAREE",
    companyName: "Naree Foundation",
    designatedHrEmail: "hr@naree.internal",
    isActive: true,
  },
  {
    id: "emp_naree_field_102",
    firstName: "Ramesh",
    lastName: "Joshi",
    fullName: "Ramesh Joshi",
    employeeNumber: "NF-FIELD-102",
    email: "ramesh.joshi@nareefoundation.org",
    designation: "Rural Logistics Officer",
    departmentName: "Field Operations",
    organizationId: "org_naree_foundation",
    companyCode: "NAREE",
    companyName: "Naree Foundation",
    designatedHrEmail: "hr@naree.internal",
    isActive: true,
  },
];

/**
 * Searches the database and corporate workforce registry for a matching employee record.
 * Returns null if the employee or email is NOT registered in the CRM.
 */
export async function findRegisteredEmployee(rawInput: string): Promise<RegisteredEmployee | null> {
  const q = rawInput.trim();
  if (!q) return null;

  const normalized = q.toLowerCase();
  const upper = q.toUpperCase();

  // 1. First, search database if available
  try {
    const dbEmp = await db.employee.findFirst({
      where: {
        OR: [
          { email: { equals: normalized, mode: "insensitive" } },
          { employeeNumber: { equals: upper, mode: "insensitive" } },
          { id: q },
        ],
      },
      include: {
        organization: true,
        department: true,
        user: true,
      },
    });

    if (dbEmp) {
      const isCompanyB =
        dbEmp.organization?.code === "NAREE" ||
        dbEmp.organizationId === "org_naree_foundation" ||
        dbEmp.employeeNumber.startsWith("NF-");

      const companyName = isCompanyB ? "Naree Foundation" : "Naree Foundation Venture Studio (NFVS)";
      const companyCode = isCompanyB ? "NAREE" : "NFVS-STUDIO";
      const orgId = isCompanyB ? "org_naree_foundation" : "org_nfvs_studio";
      const designatedHrEmail = isCompanyB
        ? (process.env.COMPANY_B_HR_EMAIL || "hr@naree.internal")
        : (process.env.COMPANY_A_HR_EMAIL || "hr@nfvs.in");

      return {
        id: dbEmp.id,
        firstName: dbEmp.firstName,
        lastName: dbEmp.lastName,
        fullName: `${dbEmp.firstName} ${dbEmp.lastName}`.trim(),
        employeeNumber: dbEmp.employeeNumber,
        email: dbEmp.email,
        designation: dbEmp.designation,
        departmentName: dbEmp.department?.name || "General",
        organizationId: orgId,
        companyCode: companyCode,
        companyName,
        designatedHrEmail,
        phone: dbEmp.phone || undefined,
        isActive: dbEmp.employmentStatus === "ACTIVE",
      };
    }

    // Check by user account
    const dbUser = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalized, mode: "insensitive" } },
          { id: q },
        ],
      },
      include: {
        employee: {
          include: {
            organization: true,
            department: true,
          },
        },
      },
    });

    if (dbUser?.employee) {
      const emp = dbUser.employee;
      const isCompanyB =
        emp.organization?.code === "NAREE" ||
        emp.organizationId === "org_naree_foundation" ||
        emp.employeeNumber.startsWith("NF-");

      const companyName = isCompanyB ? "Naree Foundation" : "Naree Foundation Venture Studio (NFVS)";
      const companyCode = isCompanyB ? "NAREE" : "NFVS-STUDIO";
      const orgId = isCompanyB ? "org_naree_foundation" : "org_nfvs_studio";
      const designatedHrEmail = isCompanyB
        ? (process.env.COMPANY_B_HR_EMAIL || "hr@naree.internal")
        : (process.env.COMPANY_A_HR_EMAIL || "hr@nfvs.in");

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
        employeeNumber: emp.employeeNumber,
        email: emp.email,
        designation: emp.designation,
        departmentName: emp.department?.name || "General",
        organizationId: orgId,
        companyCode: companyCode,
        companyName,
        designatedHrEmail,
        phone: emp.phone || undefined,
        isActive: dbUser.isActive,
      };
    }
  } catch (err: any) {
    // Database may be offline/paused, gracefully proceed to registry check
  }

  // 2. Search against Authoritative Corporate Registry
  const matched = REGISTERED_WORKFORCE.find((emp) => {
    return (
      emp.email.toLowerCase() === normalized ||
      emp.employeeNumber.toUpperCase() === upper ||
      emp.id === q ||
      (emp.id === "emp_hr_naree_01" && (normalized === "hr@naree.internal" || normalized === "hr@nf.in" || normalized === "hr_naree" || normalized === "hr_nf"))
    );
  });

  if (matched) {
    return matched;
  }

  // NOT registered in the CRM! Return null.
  return null;
}
