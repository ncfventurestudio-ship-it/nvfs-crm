import fs from "fs";
import path from "path";

export interface StoredEmployee {
  id: string;
  organizationId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  designation: string;
  departmentId?: string | null;
  department?: { id: string; name: string; code?: string } | null;
  teamId?: string | null;
  team?: any | null;
  managerId?: string | null;
  manager?: { id: string; firstName: string; lastName: string; designation: string } | null;
  user?: {
    id: string;
    email?: string;
    isActive?: boolean;
    role: { id?: string; code: string; name: string; level?: number };
    loginPassword?: string | null;
    passwordHash?: string | null;
  } | null;
  loginPassword?: string | null;
  passwordHash?: string | null;
  organization?: { id: string; name: string; code: string } | null;
  employmentType: string;
  employmentStatus: string;
  workMode: string;
  location: string;
  hireDate: string;
  emergencyContact?: string | null;
  onboardingStatus?: string;
  profileCompletion?: number;
  profile?: any | null;
  documents?: any[];
  approvalNotes?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  assignedTasks?: any[];
  operationAssignments?: any[];
  onDutyAssignments?: any[];
  isFree?: boolean;
  busyReason?: string | null;
  activeTasksCount?: number;
  activeOpsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const STORE_FILE = path.join(DATA_DIR, "employees.json");

// Authoritative preloaded employees across Company A (NFVS Studio) & Company B (Naree Foundation)
export const SEED_EMPLOYEES: StoredEmployee[] = [
  // =========================================================================
  // COMPANY A: NAREE FOUNDATION VENTURE STUDIO (NFVS)
  // =========================================================================
  {
    id: "emp_nfvs_gouri_029",
    organizationId: "org_nfvs_studio",
    employeeNumber: "NFVS-ENG-029",
    firstName: "Gouri",
    lastName: "Jadhav",
    email: "gourisjadhav2006@gmail.com",
    phone: "+91 98200 12345",
    designation: "Software Development Engineer",
    departmentId: "dept_eng",
    department: { id: "dept_eng", name: "Engineering & Innovation Hub", code: "ENG" },
    organization: { id: "org_nfvs_studio", name: "Naree Foundation Venture Studio (NFVS)", code: "NFVS-STUDIO" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "HYBRID",
    location: "Headquarters (Mumbai)",
    hireDate: "2024-03-01T00:00:00.000Z",
    emergencyContact: "Anand Jadhav (+91 98200 54321)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_emp_nfvs_gouri_029",
      email: "gourisjadhav2006@gmail.com",
      isActive: true,
      role: { code: "EMPLOYEE", name: "Software Engineer", level: 10 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_nfvs_rahul_042",
    organizationId: "org_nfvs_studio",
    employeeNumber: "NFVS-ENG-042",
    firstName: "Rahul",
    lastName: "Sharma",
    email: "rahul.sharma@nfvs.in",
    phone: "+91 98201 23456",
    designation: "Senior Frontend Engineer",
    departmentId: "dept_eng",
    department: { id: "dept_eng", name: "Engineering & Innovation Hub", code: "ENG" },
    organization: { id: "org_nfvs_studio", name: "Naree Foundation Venture Studio (NFVS)", code: "NFVS-STUDIO" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "HYBRID",
    location: "Headquarters (Mumbai)",
    hireDate: "2024-02-15T00:00:00.000Z",
    emergencyContact: "Sunil Sharma (+91 98201 65432)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_rahul_sharma",
      email: "rahul.sharma@nfvs.in",
      isActive: true,
      role: { code: "EMPLOYEE", name: "Senior Frontend Engineer", level: 10 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-02-15T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_nfvs_0008",
    organizationId: "org_nfvs_studio",
    employeeNumber: "NFVS-0008",
    firstName: "Alex",
    lastName: "Mercer",
    email: "alex.mercer@nfvs.internal",
    phone: "+1-555-0108",
    designation: "Senior Staff Systems Engineer",
    departmentId: "dept_cloud",
    department: { id: "dept_cloud", name: "Cloud Infrastructure", code: "CLOUD" },
    organization: { id: "org_nfvs_studio", name: "Naree Foundation Venture Studio (NFVS)", code: "NFVS-STUDIO" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "HYBRID",
    location: "San Francisco Engineering Hub",
    hireDate: "2024-01-10T00:00:00.000Z",
    emergencyContact: "Sarah Mercer (+1-555-9108)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_alex_mercer",
      email: "alex.mercer@nfvs.internal",
      isActive: true,
      role: { code: "EMPLOYEE", name: "Systems Engineer", level: 10 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-01-10T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_nfvs_0009",
    organizationId: "org_nfvs_studio",
    employeeNumber: "NFVS-0009",
    firstName: "James",
    lastName: "Morrison",
    email: "james.morrison.contractor@nfvs.external",
    phone: "+1-555-0109",
    designation: "Field Logistics Operations Specialist",
    departmentId: "dept_ops",
    department: { id: "dept_ops", name: "Operations & Logistics", code: "OPS" },
    organization: { id: "org_nfvs_studio", name: "Naree Foundation Venture Studio (NFVS)", code: "NFVS-STUDIO" },
    employmentType: "CONTRACT",
    employmentStatus: "ACTIVE",
    workMode: "ON_SITE",
    location: "Headquarters (Mumbai)",
    hireDate: "2024-04-01T00:00:00.000Z",
    emergencyContact: "Clara Morrison (+1-555-9109)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_james_morrison",
      email: "james.morrison.contractor@nfvs.external",
      isActive: true,
      role: { code: "EMPLOYEE", name: "Operations Specialist", level: 10 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-04-01T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_hr_01",
    organizationId: "org_nfvs_studio",
    employeeNumber: "NFVS-HR-001",
    firstName: "Sayali",
    lastName: "Kale",
    email: "hr@nfvs.in",
    phone: "+91 98765 43210",
    designation: "HR Operations Lead",
    departmentId: "dept_hr",
    department: { id: "dept_hr", name: "Human Resources", code: "HR" },
    organization: { id: "org_nfvs_studio", name: "Naree Foundation Venture Studio (NFVS)", code: "NFVS-STUDIO" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "HYBRID",
    location: "Headquarters (Mumbai)",
    hireDate: "2024-01-15T00:00:00.000Z",
    emergencyContact: "Ramesh Kale (+91 98765 99999)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_hr_nfvs",
      email: "hr@nfvs.in",
      isActive: true,
      role: { code: "HR", name: "Human Resources Officer", level: 50 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_superadmin_01",
    organizationId: "org_nfvs_studio",
    employeeNumber: "NFVS-SA-001",
    firstName: "Enterprise",
    lastName: "Superadmin",
    email: "superadmin@nfvs.internal",
    phone: "+91 98765 00000",
    designation: "Chief Executive Superadmin",
    departmentId: "dept_exec",
    department: { id: "dept_exec", name: "Executive Leadership", code: "EXEC" },
    organization: { id: "org_nfvs_studio", name: "Naree Foundation Venture Studio (NFVS)", code: "NFVS-STUDIO" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "ON_SITE",
    location: "Headquarters (Mumbai)",
    hireDate: "2023-01-01T00:00:00.000Z",
    emergencyContact: "Enterprise Governance Board",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_superadmin",
      email: "superadmin@nfvs.internal",
      isActive: true,
      role: { code: "SUPER_ADMIN", name: "Super Administrator", level: 100 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },

  // =========================================================================
  // COMPANY B: NAREE FOUNDATION (NAREE)
  // =========================================================================
  {
    id: "emp_hr_naree_01",
    organizationId: "org_naree_foundation",
    employeeNumber: "NF-HR-001",
    firstName: "Pooja",
    lastName: "Sharma",
    email: "hr@nf.in",
    phone: "+91 98765 12345",
    designation: "HR Operations Officer",
    departmentId: "dept_hr_nf",
    department: { id: "dept_hr_nf", name: "Human Capital & Social Impact", code: "HR" },
    organization: { id: "org_naree_foundation", name: "Naree Foundation", code: "NAREE" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "HYBRID",
    location: "Headquarters (Pune)",
    hireDate: "2024-01-15T00:00:00.000Z",
    emergencyContact: "Alok Sharma (+91 98765 54321)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_hr_nf",
      email: "hr@nf.in",
      isActive: true,
      role: { code: "HR", name: "Human Resources Officer", level: 50 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_naree_field_108",
    organizationId: "org_naree_foundation",
    employeeNumber: "NF-FIELD-108",
    firstName: "Anjali",
    lastName: "Deshmukh",
    email: "anjali.deshmukh@nareefoundation.org",
    phone: "+91 98202 34567",
    designation: "Outreach Program Coordinator",
    departmentId: "dept_welfare_nf",
    department: { id: "dept_welfare_nf", name: "Community Welfare & Field Programs", code: "WELFARE" },
    organization: { id: "org_naree_foundation", name: "Naree Foundation", code: "NAREE" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "ON_SITE",
    location: "Field Office (Satara)",
    hireDate: "2024-02-01T00:00:00.000Z",
    emergencyContact: "Vikram Deshmukh (+91 98202 76543)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_anjali_deshmukh",
      email: "anjali.deshmukh@nareefoundation.org",
      isActive: true,
      role: { code: "EMPLOYEE", name: "Outreach Program Coordinator", level: 10 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_naree_0001",
    organizationId: "org_naree_foundation",
    employeeNumber: "NF-0001",
    firstName: "Sunita",
    lastName: "Patel",
    email: "sunita.patel@nareefoundation.org",
    phone: "+91 98203 45678",
    designation: "Social Welfare Supervisor",
    departmentId: "dept_welfare_nf",
    department: { id: "dept_welfare_nf", name: "Community Welfare & Field Programs", code: "WELFARE" },
    organization: { id: "org_naree_foundation", name: "Naree Foundation", code: "NAREE" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "ON_SITE",
    location: "Headquarters (Pune)",
    hireDate: "2024-01-01T00:00:00.000Z",
    emergencyContact: "Mahesh Patel (+91 98203 87654)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_sunita_patel",
      email: "sunita.patel@nareefoundation.org",
      isActive: true,
      role: { code: "EMPLOYEE", name: "Social Welfare Supervisor", level: 10 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
  {
    id: "emp_naree_field_102",
    organizationId: "org_naree_foundation",
    employeeNumber: "NF-FIELD-102",
    firstName: "Ramesh",
    lastName: "Joshi",
    email: "ramesh.joshi@nareefoundation.org",
    phone: "+91 98204 56789",
    designation: "Rural Logistics Officer",
    departmentId: "dept_ops_nf",
    department: { id: "dept_ops_nf", name: "Field Logistics & Operations", code: "OPS" },
    organization: { id: "org_naree_foundation", name: "Naree Foundation", code: "NAREE" },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    workMode: "ON_SITE",
    location: "Logistics Center (Nashik)",
    hireDate: "2024-03-15T00:00:00.000Z",
    emergencyContact: "Sangeeta Joshi (+91 98204 98765)",
    onboardingStatus: "COMPLETED",
    profileCompletion: 100,
    user: {
      id: "usr_ramesh_joshi",
      email: "ramesh.joshi@nareefoundation.org",
      isActive: true,
      role: { code: "EMPLOYEE", name: "Logistics Officer", level: 10 },
    },
    assignedTasks: [],
    operationAssignments: [],
    onDutyAssignments: [],
    isFree: true,
    activeTasksCount: 0,
    activeOpsCount: 0,
    createdAt: "2024-03-15T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  },
];

function ensureStoreFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(SEED_EMPLOYEES, null, 2), "utf8");
    } else {
      // Ensure seed records exist in file if not present
      try {
        const content = fs.readFileSync(STORE_FILE, "utf8");
        const list: StoredEmployee[] = JSON.parse(content || "[]");
        let modified = false;
        for (const seed of SEED_EMPLOYEES) {
          if (!list.some((e) => e.id === seed.id || e.email.toLowerCase() === seed.email.toLowerCase())) {
            list.push(seed);
            modified = true;
          }
        }
        if (modified) {
          fs.writeFileSync(STORE_FILE, JSON.stringify(list, null, 2), "utf8");
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[EmployeeStore] Warning in ensureStoreFile:", err);
  }
}

export class EmployeeStore {
  /**
   * Read all employees from persistent file store
   */
  static getAll(): StoredEmployee[] {
    try {
      ensureStoreFile();
      if (!fs.existsSync(STORE_FILE)) return SEED_EMPLOYEES;
      const content = fs.readFileSync(STORE_FILE, "utf8");
      const list: StoredEmployee[] = JSON.parse(content || "[]");
      return list.length > 0 ? list : SEED_EMPLOYEES;
    } catch (err) {
      console.warn("[EmployeeStore] Error reading file store:", err);
      return SEED_EMPLOYEES;
    }
  }

  /**
   * Save all employees to file store
   */
  static saveAll(employees: StoredEmployee[]): void {
    try {
      ensureStoreFile();
      fs.writeFileSync(STORE_FILE, JSON.stringify(employees, null, 2), "utf8");
    } catch (err) {
      console.error("[EmployeeStore] Error saving file store:", err);
    }
  }

  /**
   * Get employees strictly filtered by organization
   */
  static getByOrganization(orgIdOrCode?: string | null): StoredEmployee[] {
    const all = this.getAll();
    if (!orgIdOrCode) return all;

    const normalized = orgIdOrCode.toLowerCase();
    const isNaree =
      normalized === "org_naree_foundation" ||
      normalized === "naree" ||
      normalized === "nf" ||
      normalized.includes("foundation") && !normalized.includes("venture");

    if (isNaree) {
      return all.filter((e) => {
        const empOrg = (e.organizationId || "").toLowerCase();
        const empNum = (e.employeeNumber || "").toUpperCase();
        return empOrg === "org_naree_foundation" || empOrg === "naree" || empNum.startsWith("NF-");
      });
    }

    // Default to NFVS Studio
    return all.filter((e) => {
      const empOrg = (e.organizationId || "").toLowerCase();
      const empNum = (e.employeeNumber || "").toUpperCase();
      return (
        empOrg === "org_nfvs_studio" ||
        empOrg === "nfvs-studio" ||
        empOrg === "org_nfvs_corp" ||
        empNum.startsWith("NFVS-") ||
        (!empOrg.includes("naree") && !empNum.startsWith("NF-"))
      );
    });
  }

  /**
   * Find employee by ID
   */
  static getById(id: string): StoredEmployee | null {
    const all = this.getAll();
    return all.find((e) => e.id === id) || null;
  }

  /**
   * Find employee by email or employee number
   */
  static findByEmailOrNumber(query: string): StoredEmployee | null {
    const q = query.trim().toLowerCase();
    const all = this.getAll();
    return (
      all.find(
        (e) =>
          e.email.toLowerCase() === q ||
          e.employeeNumber.toLowerCase() === q ||
          e.id.toLowerCase() === q
      ) || null
    );
  }

  /**
   * Create and persist a new employee
   */
  static create(data: Partial<StoredEmployee>): StoredEmployee {
    const all = this.getAll();
    const now = new Date().toISOString();
    const id = data.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newEmp: StoredEmployee = {
      id,
      organizationId: data.organizationId || "org_nfvs_studio",
      employeeNumber: data.employeeNumber || `EMP-${Date.now().toString().slice(-4)}`,
      firstName: data.firstName || "Employee",
      lastName: data.lastName || "",
      email: data.email || "",
      phone: data.phone || null,
      designation: data.designation || "Staff Specialist",
      departmentId: data.departmentId || null,
      department: data.department || null,
      managerId: data.managerId || null,
      manager: data.manager || null,
      user: data.user || null,
      loginPassword: data.loginPassword || data.user?.loginPassword || null,
      passwordHash: data.passwordHash || data.user?.passwordHash || null,
      organization: data.organization || null,
      employmentType: data.employmentType || "FULL_TIME",
      employmentStatus: data.employmentStatus || "ACTIVE",
      workMode: data.workMode || "ON_SITE",
      location: data.location || "Headquarters (Mumbai)",
      hireDate: data.hireDate || now,
      emergencyContact: data.emergencyContact || null,
      onboardingStatus: data.onboardingStatus || "COMPLETED",
      profileCompletion: data.profileCompletion ?? 100,
      assignedTasks: data.assignedTasks || [],
      operationAssignments: data.operationAssignments || [],
      onDutyAssignments: data.onDutyAssignments || [],
      isFree: true,
      activeTasksCount: 0,
      activeOpsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Remove existing if matching ID or email
    const filtered = all.filter(
      (e) => e.id !== newEmp.id && e.email.toLowerCase() !== newEmp.email.toLowerCase()
    );
    filtered.unshift(newEmp);
    this.saveAll(filtered);
    return newEmp;
  }

  /**
   * Update an existing employee
   */
  static update(id: string, updates: Partial<StoredEmployee>): StoredEmployee | null {
    const all = this.getAll();
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const updated: StoredEmployee = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    this.saveAll(all);
    return updated;
  }

  /**
   * Delete an employee
   */
  static delete(id: string): boolean {
    const all = this.getAll();
    const filtered = all.filter((e) => e.id !== id);
    if (filtered.length !== all.length) {
      this.saveAll(filtered);
      return true;
    }
    return false;
  }
}
