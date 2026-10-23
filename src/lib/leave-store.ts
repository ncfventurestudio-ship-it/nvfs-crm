import fs from "fs";
import path from "path";

export interface StoredLeavePolicy {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  annualAllowance: number;
  monthlyLimit: number | null;
  carryForward: boolean;
  requiresApproval: boolean;
  requiresDocumentation: boolean;
  isPaid: boolean;
  description?: string | null;
}

export interface StoredLeaveBalance {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
  leavePolicy?: StoredLeavePolicy;
}

export interface StoredLeaveRequest {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  startDate: string; // ISO
  endDate: string; // ISO
  daysCount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvedById?: string | null;
  approvedBy?: {
    firstName: string;
    lastName: string;
    designation?: string;
  } | null;
  approvalNotes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id?: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    designation: string;
    department?: { name: string };
  };
  leavePolicy?: StoredLeavePolicy;
}

export interface StoredWorkDayConfig {
  id: string;
  organizationId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  isWorkingDay: boolean;
  workStartTime: string;
  workEndTime: string;
  expectedHours: number;
  isHalfDay: boolean;
}

export interface StoredHoliday {
  id: string;
  organizationId: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  isRecurring: boolean;
  year: number;
}

export interface LeaveDataPayload {
  policies: StoredLeavePolicy[];
  balances: StoredLeaveBalance[];
  requests: StoredLeaveRequest[];
  workDays: StoredWorkDayConfig[];
  holidays: StoredHoliday[];
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const STORE_FILE = path.join(DATA_DIR, "leaves.json");

const DEFAULT_POLICIES: StoredLeavePolicy[] = [
  {
    id: "pol_cl",
    organizationId: "org_nfvs_studio",
    code: "CL",
    name: "Casual Leave",
    annualAllowance: 12,
    monthlyLimit: 2,
    carryForward: false,
    requiresApproval: true,
    requiresDocumentation: false,
    isPaid: true,
    description: "Standard casual leave allowance for personal affairs (max 2 days per month).",
  },
  {
    id: "pol_el",
    organizationId: "org_nfvs_studio",
    code: "EL",
    name: "Earned / Privilege Leave",
    annualAllowance: 15,
    monthlyLimit: null,
    carryForward: true,
    requiresApproval: true,
    requiresDocumentation: false,
    isPaid: true,
    description: "Accumulated earned leave for vacations and prolonged rest.",
  },
  {
    id: "pol_ml",
    organizationId: "org_nfvs_studio",
    code: "ML",
    name: "Sick / Medical Leave",
    annualAllowance: 10,
    monthlyLimit: null,
    carryForward: false,
    requiresApproval: true,
    requiresDocumentation: true,
    isPaid: true,
    description: "Medical necessity leave (doctor note recommended for >2 consecutive days).",
  },
  {
    id: "pol_lwp",
    organizationId: "org_nfvs_studio",
    code: "LWP",
    name: "Leave Without Pay",
    annualAllowance: 0,
    monthlyLimit: null,
    carryForward: false,
    requiresApproval: true,
    requiresDocumentation: false,
    isPaid: false,
    description: "Unpaid leave for exceptional circumstances beyond allocated quotas.",
  },
  {
    id: "pol_coff",
    organizationId: "org_nfvs_studio",
    code: "C_OFF",
    name: "Compensatory Off",
    annualAllowance: 5,
    monthlyLimit: null,
    carryForward: false,
    requiresApproval: true,
    requiresDocumentation: false,
    isPaid: true,
    description: "Credit days granted for operational overtime or emergency weekend work.",
  },
  {
    id: "pol_hdw",
    organizationId: "org_nfvs_studio",
    code: "HDW",
    name: "Half Day Work / Leave",
    annualAllowance: 6,
    monthlyLimit: null,
    carryForward: false,
    requiresApproval: false,
    requiresDocumentation: false,
    isPaid: true,
    description: "Half-day flexibility credit for doctor appointments or administrative errands.",
  },
];

const DEFAULT_WORK_DAYS: StoredWorkDayConfig[] = [
  { id: "wd_0", organizationId: "org_nfvs_studio", dayOfWeek: 0, dayName: "Sunday", isWorkingDay: false, workStartTime: "09:00", workEndTime: "18:00", expectedHours: 0, isHalfDay: false },
  { id: "wd_1", organizationId: "org_nfvs_studio", dayOfWeek: 1, dayName: "Monday", isWorkingDay: true, workStartTime: "09:00", workEndTime: "18:00", expectedHours: 8, isHalfDay: false },
  { id: "wd_2", organizationId: "org_nfvs_studio", dayOfWeek: 2, dayName: "Tuesday", isWorkingDay: true, workStartTime: "09:00", workEndTime: "18:00", expectedHours: 8, isHalfDay: false },
  { id: "wd_3", organizationId: "org_nfvs_studio", dayOfWeek: 3, dayName: "Wednesday", isWorkingDay: true, workStartTime: "09:00", workEndTime: "18:00", expectedHours: 8, isHalfDay: false },
  { id: "wd_4", organizationId: "org_nfvs_studio", dayOfWeek: 4, dayName: "Thursday", isWorkingDay: true, workStartTime: "09:00", workEndTime: "18:00", expectedHours: 8, isHalfDay: false },
  { id: "wd_5", organizationId: "org_nfvs_studio", dayOfWeek: 5, dayName: "Friday", isWorkingDay: true, workStartTime: "09:00", workEndTime: "18:00", expectedHours: 8, isHalfDay: false },
  { id: "wd_6", organizationId: "org_nfvs_studio", dayOfWeek: 6, dayName: "Saturday", isWorkingDay: false, workStartTime: "09:00", workEndTime: "18:00", expectedHours: 0, isHalfDay: false },
];

const DEFAULT_HOLIDAYS: StoredHoliday[] = [
  { id: "hol_1", organizationId: "org_nfvs_studio", name: "Republic Day", date: "2026-01-26", description: "National Holiday", isRecurring: true, year: 2026 },
  { id: "hol_2", organizationId: "org_nfvs_studio", name: "Holi (Festival of Colors)", date: "2026-03-04", description: "National Holiday", isRecurring: false, year: 2026 },
  { id: "hol_3", organizationId: "org_nfvs_studio", name: "Independence Day", date: "2026-08-15", description: "National Holiday", isRecurring: true, year: 2026 },
  { id: "hol_4", organizationId: "org_nfvs_studio", name: "Mahatma Gandhi Jayanti", date: "2026-10-02", description: "National Observance", isRecurring: true, year: 2026 },
  { id: "hol_5", organizationId: "org_nfvs_studio", name: "Diwali (Festival of Lights)", date: "2026-11-08", description: "Public Holiday", isRecurring: false, year: 2026 },
  { id: "hol_6", organizationId: "org_nfvs_studio", name: "Christmas Day", date: "2026-12-25", description: "Public Holiday", isRecurring: true, year: 2026 },
];

const SEED_REQUESTS: StoredLeaveRequest[] = [
  {
    id: "req_seed_01",
    employeeId: "emp_nfvs_gouri_029",
    leavePolicyId: "pol_cl",
    startDate: "2026-10-15T00:00:00.000Z",
    endDate: "2026-10-16T00:00:00.000Z",
    daysCount: 2,
    reason: "Personal family function in Pune",
    status: "APPROVED",
    approvedById: "emp_nfvs_coo",
    approvedBy: { firstName: "Operations", lastName: "Director", designation: "Chief Operating Officer" },
    approvalNotes: "Approved - work coverage confirmed",
    createdAt: "2026-10-10T10:00:00.000Z",
    updatedAt: "2026-10-11T12:00:00.000Z",
    employee: {
      firstName: "Gouri",
      lastName: "Rathod",
      employeeNumber: "NFVS-ENG-029",
      designation: "Frontend Engineer",
      department: { name: "Engineering" },
    },
    leavePolicy: DEFAULT_POLICIES[0],
  },
  {
    id: "req_seed_02",
    employeeId: "emp_nfvs_rahul_014",
    leavePolicyId: "pol_ml",
    startDate: "2026-10-20T00:00:00.000Z",
    endDate: "2026-10-21T00:00:00.000Z",
    daysCount: 2,
    reason: "Severe viral fever and clinical recovery",
    status: "APPROVED",
    approvedById: "emp_nfvs_sayali_hr",
    approvedBy: { firstName: "Sayali", lastName: "Kale", designation: "HR Operations Lead" },
    approvalNotes: "Medical prescription verified",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T09:30:00.000Z",
    employee: {
      firstName: "Rahul",
      lastName: "Patil",
      employeeNumber: "NFVS-MKT-014",
      designation: "Marketing Specialist",
      department: { name: "Marketing" },
    },
    leavePolicy: DEFAULT_POLICIES[2],
  },
];

export class LeaveStore {
  private static cache: LeaveDataPayload | null = null;

  private static ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private static load(): LeaveDataPayload {
    if (this.cache) return this.cache;

    this.ensureDir();
    if (!fs.existsSync(STORE_FILE)) {
      const initial: LeaveDataPayload = {
        policies: DEFAULT_POLICIES,
        balances: [],
        requests: SEED_REQUESTS,
        workDays: DEFAULT_WORK_DAYS,
        holidays: DEFAULT_HOLIDAYS,
      };
      this.save(initial);
      this.cache = initial;
      return initial;
    }

    try {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      this.cache = JSON.parse(raw);
      if (!this.cache?.policies) {
        throw new Error("Invalid format");
      }
      return this.cache;
    } catch {
      const initial: LeaveDataPayload = {
        policies: DEFAULT_POLICIES,
        balances: [],
        requests: SEED_REQUESTS,
        workDays: DEFAULT_WORK_DAYS,
        holidays: DEFAULT_HOLIDAYS,
      };
      this.save(initial);
      this.cache = initial;
      return initial;
    }
  }

  private static save(data: LeaveDataPayload) {
    this.ensureDir();
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
    this.cache = data;
  }

  /**
   * Policies
   */
  static getPolicies(orgId?: string): StoredLeavePolicy[] {
    const data = this.load();
    return data.policies;
  }

  static getPolicyByCode(code: string, orgId?: string): StoredLeavePolicy | undefined {
    const data = this.load();
    return data.policies.find((p) => p.code.toUpperCase() === code.toUpperCase());
  }

  static getPolicyById(id: string): StoredLeavePolicy | undefined {
    const data = this.load();
    return data.policies.find((p) => p.id === id);
  }

  static updatePolicy(policyId: string, updates: Partial<StoredLeavePolicy>): StoredLeavePolicy {
    const data = this.load();
    const idx = data.policies.findIndex((p) => p.id === policyId);
    if (idx === -1) {
      throw new Error("Leave policy not found");
    }

    data.policies[idx] = {
      ...data.policies[idx],
      ...updates,
    };

    // If annual allowance changed, sync existing balances
    if (typeof updates.annualAllowance === "number") {
      const newAllowance = updates.annualAllowance;
      data.balances = data.balances.map((b) => {
        if (b.leavePolicyId === policyId) {
          const remaining = Math.max(0, newAllowance - b.used - b.pending);
          return { ...b, allocated: newAllowance, remaining };
        }
        return b;
      });
    }

    this.save(data);
    return data.policies[idx];
  }

  /**
   * Balances
   */
  static getBalances(employeeId: string, year = new Date().getFullYear()): StoredLeaveBalance[] {
    const data = this.load();
    let empBalances = data.balances.filter((b) => b.employeeId === employeeId && b.year === year);

    if (empBalances.length === 0) {
      // Auto-initialize standard balances for all policies
      const created: StoredLeaveBalance[] = data.policies.map((p) => ({
        id: `bal_${employeeId}_${p.code.toLowerCase()}_${year}`,
        employeeId,
        leavePolicyId: p.id,
        year,
        allocated: p.annualAllowance,
        used: 0,
        pending: 0,
        remaining: p.annualAllowance,
        leavePolicy: p,
      }));

      data.balances.push(...created);
      this.save(data);
      empBalances = created;
    } else {
      // Ensure leavePolicy relation attached
      empBalances = empBalances.map((b) => ({
        ...b,
        leavePolicy: b.leavePolicy || this.getPolicyById(b.leavePolicyId) || DEFAULT_POLICIES[0],
      }));
    }

    return empBalances;
  }

  static getBalance(employeeId: string, leavePolicyId: string, year = new Date().getFullYear()): StoredLeaveBalance {
    const balances = this.getBalances(employeeId, year);
    const bal = balances.find((b) => b.leavePolicyId === leavePolicyId);
    if (!bal) {
      const policy = this.getPolicyById(leavePolicyId) || DEFAULT_POLICIES[0];
      const newBal: StoredLeaveBalance = {
        id: `bal_${employeeId}_${policy.code.toLowerCase()}_${year}`,
        employeeId,
        leavePolicyId: policy.id,
        year,
        allocated: policy.annualAllowance,
        used: 0,
        pending: 0,
        remaining: policy.annualAllowance,
        leavePolicy: policy,
      };
      const data = this.load();
      data.balances.push(newBal);
      this.save(data);
      return newBal;
    }
    return bal;
  }

  static adjustBalance(balanceId: string, adjustment: number): StoredLeaveBalance {
    const data = this.load();
    const idx = data.balances.findIndex((b) => b.id === balanceId);
    if (idx === -1) {
      throw new Error("Leave balance record not found");
    }

    const b = data.balances[idx];
    const newAllocated = Math.max(0, b.allocated + adjustment);
    const newRemaining = Math.max(0, b.remaining + adjustment);

    data.balances[idx] = {
      ...b,
      allocated: newAllocated,
      remaining: newRemaining,
    };

    this.save(data);
    return {
      ...data.balances[idx],
      leavePolicy: this.getPolicyById(data.balances[idx].leavePolicyId),
    };
  }

  static resetBalances(orgId: string, year = new Date().getFullYear()): { success: boolean; count: number } {
    const data = this.load();
    let count = 0;
    data.balances = data.balances.map((b) => {
      const p = this.getPolicyById(b.leavePolicyId);
      if (p) {
        count++;
        return {
          ...b,
          allocated: p.annualAllowance,
          used: 0,
          pending: 0,
          remaining: p.annualAllowance,
        };
      }
      return b;
    });

    this.save(data);
    return { success: true, count };
  }

  /**
   * Working Days Calculation
   */
  static calculateWorkingDays(startDateInput: Date | string, endDateInput: Date | string): number {
    const start = new Date(startDateInput);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateInput);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      throw new Error("End date cannot be prior to start date");
    }

    const data = this.load();
    const workDayMap = new Map<number, boolean>();
    data.workDays.forEach((w) => workDayMap.set(w.dayOfWeek, w.isWorkingDay));

    const holidayDateSet = new Set(data.holidays.map((h) => h.date));

    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      const dateStr = cur.toISOString().split("T")[0];

      const isWorkDay = workDayMap.has(dayOfWeek)
        ? !!workDayMap.get(dayOfWeek)
        : dayOfWeek >= 1 && dayOfWeek <= 5;

      const isHoliday = holidayDateSet.has(dateStr);

      if (isWorkDay && !isHoliday) {
        count++;
      }

      cur.setDate(cur.getDate() + 1);
    }

    return count;
  }

  /**
   * Requests
   */
  static getRequests(options: {
    employeeId?: string;
    managerId?: string;
    orgId?: string;
    status?: string;
  } = {}): StoredLeaveRequest[] {
    const data = this.load();
    let list = [...data.requests];

    if (options.employeeId) {
      list = list.filter((r) => r.employeeId === options.employeeId);
    }

    if (options.status) {
      list = list.filter((r) => r.status === options.status);
    }

    // Sort by newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.map((r) => ({
      ...r,
      leavePolicy: r.leavePolicy || this.getPolicyById(r.leavePolicyId) || DEFAULT_POLICIES[0],
    }));
  }

  static getRequestById(id: string): StoredLeaveRequest | undefined {
    const data = this.load();
    const req = data.requests.find((r) => r.id === id);
    if (!req) return undefined;
    return {
      ...req,
      leavePolicy: req.leavePolicy || this.getPolicyById(req.leavePolicyId) || DEFAULT_POLICIES[0],
    };
  }

  static createRequest(params: {
    employeeId: string;
    leavePolicyCode: string;
    startDate: Date | string;
    endDate: Date | string;
    reason: string;
    daysCount?: number;
    employeeInfo?: {
      firstName: string;
      lastName: string;
      employeeNumber: string;
      designation: string;
      departmentName?: string;
    };
  }): StoredLeaveRequest {
    const data = this.load();

    const policy = this.getPolicyByCode(params.leavePolicyCode) || DEFAULT_POLICIES[0];

    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const daysCount = params.daysCount ?? this.calculateWorkingDays(start, end);

    if (daysCount === 0) {
      const isSingleDay = start.toISOString().split("T")[0] === end.toISOString().split("T")[0];
      const dayName = start.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      if (isSingleDay) {
        throw new Error(`The selected date (${dayName}) is a non-working weekend day or public holiday. Leave is only required for business working days.`);
      }
      throw new Error("Selected date range contains 0 working days (all dates fall on weekends or public holidays).");
    }

    // Monthly CL validation
    if (policy.code === "CL" && policy.monthlyLimit) {
      const month = start.getMonth();
      const year = start.getFullYear();
      const existingCl = data.requests
        .filter((r) => {
          if (r.employeeId !== params.employeeId || r.leavePolicyId !== policy.id) return false;
          if (r.status !== "PENDING" && r.status !== "APPROVED") return false;
          const rDate = new Date(r.startDate);
          return rDate.getMonth() === month && rDate.getFullYear() === year;
        })
        .reduce((sum, r) => sum + r.daysCount, 0);

      if (existingCl + daysCount > policy.monthlyLimit) {
        throw new Error(
          `Monthly Casual Leave limit exceeded: Policy allows a maximum of ${policy.monthlyLimit} CL days per month. You currently have ${existingCl} CL days booked for ${start.toLocaleString("default", { month: "long" })}.`
        );
      }
    }

    // Overlapping leave validation
    const hasOverlap = data.requests.some((r) => {
      if (r.employeeId !== params.employeeId) return false;
      if (r.status !== "PENDING" && r.status !== "APPROVED") return false;
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      return rStart <= end && rEnd >= start;
    });

    if (hasOverlap) {
      throw new Error("Overlapping leave conflict: You already have a pending or approved leave covering these dates.");
    }

    // Balance validation & deduction
    const balance = this.getBalance(params.employeeId, policy.id, start.getFullYear());
    if (policy.code !== "LWP" && policy.annualAllowance > 0) {
      if (balance.remaining < daysCount) {
        throw new Error(
          `Insufficient leave balance: You have ${balance.remaining} ${policy.name} days remaining, but requested ${daysCount} days.`
        );
      }
    }

    // Deduct pending balance
    const balIdx = data.balances.findIndex((b) => b.id === balance.id);
    if (balIdx !== -1) {
      const newPending = data.balances[balIdx].pending + daysCount;
      const newRemaining = data.balances[balIdx].allocated - data.balances[balIdx].used - newPending;
      data.balances[balIdx].pending = newPending;
      data.balances[balIdx].remaining = newRemaining;
    }

    const newRequest: StoredLeaveRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      employeeId: params.employeeId,
      leavePolicyId: policy.id,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      daysCount,
      reason: params.reason,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      employee: {
        firstName: params.employeeInfo?.firstName || "Team",
        lastName: params.employeeInfo?.lastName || "Member",
        employeeNumber: params.employeeInfo?.employeeNumber || "EMP-001",
        designation: params.employeeInfo?.designation || "Staff",
        department: { name: params.employeeInfo?.departmentName || "General" },
      },
      leavePolicy: policy,
    };

    data.requests.unshift(newRequest);
    this.save(data);

    return newRequest;
  }

  static approveRequest(requestId: string, approverEmployeeId: string, notes = "Approved"): StoredLeaveRequest {
    const data = this.load();
    const idx = data.requests.findIndex((r) => r.id === requestId);
    if (idx === -1) throw new Error("Leave request not found");

    const req = data.requests[idx];
    if (req.status !== "PENDING") {
      throw new Error(`Cannot approve a leave request that is already ${req.status.toLowerCase()}`);
    }

    req.status = "APPROVED";
    req.approvedById = approverEmployeeId;
    req.approvalNotes = notes;
    req.updatedAt = new Date().toISOString();

    // Move balance from pending to used
    const balIdx = data.balances.findIndex(
      (b) => b.employeeId === req.employeeId && b.leavePolicyId === req.leavePolicyId
    );
    if (balIdx !== -1) {
      const b = data.balances[balIdx];
      const newPending = Math.max(0, b.pending - req.daysCount);
      const newUsed = b.used + req.daysCount;
      const newRemaining = b.allocated - newUsed - newPending;
      data.balances[balIdx] = {
        ...b,
        pending: newPending,
        used: newUsed,
        remaining: newRemaining,
      };
    }

    this.save(data);
    return req;
  }

  static rejectRequest(requestId: string, approverEmployeeId: string, reason = "Operational requirements"): StoredLeaveRequest {
    const data = this.load();
    const idx = data.requests.findIndex((r) => r.id === requestId);
    if (idx === -1) throw new Error("Leave request not found");

    const req = data.requests[idx];
    if (req.status !== "PENDING") {
      throw new Error(`Cannot reject a leave request that is already ${req.status.toLowerCase()}`);
    }

    req.status = "REJECTED";
    req.approvedById = approverEmployeeId;
    req.rejectionReason = reason;
    req.updatedAt = new Date().toISOString();

    // Release pending balance
    const balIdx = data.balances.findIndex(
      (b) => b.employeeId === req.employeeId && b.leavePolicyId === req.leavePolicyId
    );
    if (balIdx !== -1) {
      const b = data.balances[balIdx];
      const newPending = Math.max(0, b.pending - req.daysCount);
      const newRemaining = b.allocated - b.used - newPending;
      data.balances[balIdx] = {
        ...b,
        pending: newPending,
        remaining: newRemaining,
      };
    }

    this.save(data);
    return req;
  }

  static cancelRequest(requestId: string, employeeId: string): StoredLeaveRequest {
    const data = this.load();
    const idx = data.requests.findIndex((r) => r.id === requestId);
    if (idx === -1) throw new Error("Leave request not found");

    const req = data.requests[idx];
    if (req.employeeId !== employeeId) {
      throw new Error("Unauthorized: You can only cancel your own leave requests");
    }
    if (req.status === "CANCELLED" || req.status === "REJECTED") {
      throw new Error(`Request is already ${req.status.toLowerCase()}`);
    }

    const wasApproved = req.status === "APPROVED";
    req.status = "CANCELLED";
    req.updatedAt = new Date().toISOString();

    // Rollback balance
    const balIdx = data.balances.findIndex(
      (b) => b.employeeId === req.employeeId && b.leavePolicyId === req.leavePolicyId
    );
    if (balIdx !== -1) {
      const b = data.balances[balIdx];
      if (wasApproved) {
        const newUsed = Math.max(0, b.used - req.daysCount);
        const newRemaining = b.allocated - newUsed - b.pending;
        data.balances[balIdx] = { ...b, used: newUsed, remaining: newRemaining };
      } else {
        const newPending = Math.max(0, b.pending - req.daysCount);
        const newRemaining = b.allocated - b.used - newPending;
        data.balances[balIdx] = { ...b, pending: newPending, remaining: newRemaining };
      }
    }

    this.save(data);
    return req;
  }

  /**
   * WorkDay & Holiday Configs
   */
  static getWorkDays(orgId?: string): StoredWorkDayConfig[] {
    const data = this.load();
    return data.workDays;
  }

  static getHolidays(orgId?: string, year = new Date().getFullYear()): StoredHoliday[] {
    const data = this.load();
    return data.holidays.filter((h) => h.year === year);
  }

  /**
   * Management Data for Executive / HR Overview
   */
  static getOrganizationManagementData(organizationId: string, year = new Date().getFullYear()) {
    const data = this.load();
    const policies = data.policies;
    const pendingRequests = data.requests.filter((r) => r.status === "PENDING");
    const allRequests = data.requests.slice(0, 50);

    // Group balances per known employee in records
    const empMap = new Map<string, any>();
    data.requests.forEach((r) => {
      if (r.employee && !empMap.has(r.employeeId)) {
        empMap.set(r.employeeId, {
          id: r.employeeId,
          firstName: r.employee.firstName,
          lastName: r.employee.lastName,
          employeeNumber: r.employee.employeeNumber,
          designation: r.employee.designation,
          department: r.employee.department,
          leaveBalances: this.getBalances(r.employeeId, year),
        });
      }
    });

    return {
      policies,
      pendingRequests,
      allRequests,
      employeesWithBalances: Array.from(empMap.values()),
    };
  }
}
