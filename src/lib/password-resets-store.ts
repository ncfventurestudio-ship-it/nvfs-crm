import fs from "fs";
import path from "path";

export interface StoredPasswordResetRequest {
  id: string;
  requestNumber: string;
  category: "PASSWORD_RESET";
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  organizationId: string;
  companyCode: string;
  companyName: string;
  hrEmail: string;
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    email: string;
    designation: string;
    department?: { id: string; name: string } | null;
    user?: { id: string; email: string; isActive: boolean; lastLoginAt: string | null } | null;
  };
  metadata?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const STORE_FILE = path.join(DATA_DIR, "password-resets.json");

// Default initial requests representing Company A and Company B
const INITIAL_REQUESTS: StoredPasswordResetRequest[] = [
  {
    id: "req_reset_nfvs_01",
    requestNumber: "REQ-2026-0001",
    category: "PASSWORD_RESET",
    title: "Password Reset Request - Rahul Sharma (NFVS-ENG-042)",
    description: "Employee requested password reset: Forgot system password after weekend system upgrade.",
    status: "PENDING",
    organizationId: "org_nfvs_studio",
    companyCode: "NFVS-STUDIO",
    companyName: "Naree Foundation Venture Studio (NFVS)",
    hrEmail: "hr@nfvs.in",
    employeeId: "emp_nfvs_eng_042",
    employee: {
      id: "emp_nfvs_eng_042",
      firstName: "Rahul",
      lastName: "Sharma",
      employeeNumber: "NFVS-ENG-042",
      email: "rahul.sharma@nfvs.in",
      designation: "Senior Frontend Engineer",
      department: { id: "dept_tech", name: "Engineering & Innovation" },
      user: { id: "usr_rahul_sharma", email: "rahul.sharma@nfvs.in", isActive: true, lastLoginAt: null },
    },
    metadata: JSON.stringify({
      company: "Company A - NFVS Studio",
      note: "Forgot system password after weekend system upgrade.",
    }),
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    approvedAt: null,
    approver: null,
  },
  {
    id: "req_reset_naree_01",
    requestNumber: "REQ-2026-0002",
    category: "PASSWORD_RESET",
    title: "Password Reset Request - Anjali Deshmukh (NF-FIELD-108)",
    description: "Employee requested password reset: New tablet device allocated for rural outreach program.",
    status: "PENDING",
    organizationId: "org_naree_foundation",
    companyCode: "NAREE",
    companyName: "Naree Foundation",
    hrEmail: "hr@naree.internal",
    employeeId: "emp_naree_field_108",
    employee: {
      id: "emp_naree_field_108",
      firstName: "Anjali",
      lastName: "Deshmukh",
      employeeNumber: "NF-FIELD-108",
      email: "anjali.deshmukh@nareefoundation.org",
      designation: "Outreach Program Coordinator",
      department: { id: "dept_social_impact", name: "Community Welfare & Field Programs" },
      user: { id: "usr_anjali_deshmukh", email: "anjali.deshmukh@nareefoundation.org", isActive: true, lastLoginAt: null },
    },
    metadata: JSON.stringify({
      company: "Company B - Naree Foundation",
      note: "New tablet device allocated for rural outreach program.",
    }),
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    approvedAt: null,
    approver: null,
  },
];

function ensureStoreFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(INITIAL_REQUESTS, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("[PasswordResetsStore] Warning in ensureStoreFile:", err);
  }
}

export class PasswordResetsStore {
  /**
   * Read all requests from persistent file
   */
  static getAll(): StoredPasswordResetRequest[] {
    try {
      ensureStoreFile();
      if (!fs.existsSync(STORE_FILE)) return INITIAL_REQUESTS;
      const content = fs.readFileSync(STORE_FILE, "utf8");
      return JSON.parse(content || "[]");
    } catch (err) {
      console.warn("[PasswordResetsStore] Error reading file store:", err);
      return INITIAL_REQUESTS;
    }
  }

  /**
   * Write all requests to persistent file
   */
  static saveAll(requests: StoredPasswordResetRequest[]): void {
    try {
      ensureStoreFile();
      fs.writeFileSync(STORE_FILE, JSON.stringify(requests, null, 2), "utf8");
    } catch (err) {
      console.error("[PasswordResetsStore] Error saving file store:", err);
    }
  }

  /**
   * Filter requests by company/organization
   */
  static getByCompany(companyContext?: {
    orgId?: string | null;
    companyCode?: string | null;
    isSuperAdmin?: boolean;
  }): StoredPasswordResetRequest[] {
    const all = this.getAll();
    if (!companyContext || companyContext.isSuperAdmin) {
      return all;
    }

    const { orgId, companyCode } = companyContext;
    const isCompanyB =
      orgId === "org_naree_foundation" ||
      companyCode === "NAREE" ||
      companyCode === "NF";

    const isCompanyA =
      orgId === "org_nfvs_studio" ||
      orgId === "org_nfvs_corp" ||
      companyCode === "NFVS-STUDIO" ||
      companyCode === "NFVS-CORP" ||
      companyCode === "NFVS";

    return all.filter((r) => {
      if (isCompanyB) {
        return (
          r.organizationId === "org_naree_foundation" ||
          r.companyCode === "NAREE" ||
          r.companyCode === "NF"
        );
      }
      if (isCompanyA) {
        return (
          r.organizationId === "org_nfvs_studio" ||
          r.organizationId === "org_nfvs_corp" ||
          r.companyCode === "NFVS-STUDIO" ||
          r.companyCode === "NFVS-CORP" ||
          r.companyCode === "NFVS"
        );
      }
      if (orgId) {
        return r.organizationId === orgId;
      }
      return true;
    });
  }

  /**
   * Create a new password reset request
   */
  static create(requestData: Omit<StoredPasswordResetRequest, "id" | "requestNumber" | "createdAt" | "status" | "category"> & {
    id?: string;
    requestNumber?: string;
    category?: "PASSWORD_RESET";
  }): StoredPasswordResetRequest {
    const all = this.getAll();
    const count = all.length + 1;
    const requestNumber = requestData.requestNumber || `REQ-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
    const id = requestData.id || `req_pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newReq: StoredPasswordResetRequest = {
      ...requestData,
      id,
      requestNumber,
      category: "PASSWORD_RESET",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approver: null,
    };

    all.unshift(newReq);
    this.saveAll(all);
    return newReq;
  }

  /**
   * Mark a request as APPROVED
   */
  static markApproved(
    idOrReqNumber: string,
    approver?: { id: string; firstName: string; lastName: string } | null
  ): StoredPasswordResetRequest | null {
    const all = this.getAll();
    const index = all.findIndex(
      (r) => r.id === idOrReqNumber || r.requestNumber === idOrReqNumber || r.employeeId === idOrReqNumber
    );

    if (index === -1) {
      return null;
    }

    all[index].status = "APPROVED";
    all[index].approvedAt = new Date().toISOString();
    if (approver) {
      all[index].approver = approver;
    }

    this.saveAll(all);
    return all[index];
  }

  /**
   * Find request by ID or employee ID
   */
  static findById(idOrReqNumber: string): StoredPasswordResetRequest | null {
    const all = this.getAll();
    return (
      all.find(
        (r) =>
          r.id === idOrReqNumber ||
          r.requestNumber === idOrReqNumber ||
          r.employeeId === idOrReqNumber ||
          r.employee?.id === idOrReqNumber
      ) || null
    );
  }
}
