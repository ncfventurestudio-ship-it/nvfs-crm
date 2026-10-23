import fs from "fs";
import path from "path";

export interface StoredCalendarEvent {
  id: string;
  organizationId: string;
  creatorId: string;
  title: string;
  description?: string | null;
  type: string; // MEETING, COMPANY_EVENT, CLIENT_MEETING, DEADLINE, CURRENT_AFFAIR, OTHER
  startDate: string; // ISO
  endDate: string; // ISO
  isAllDay: boolean;
  location?: string | null;
  meetUrl?: string | null;
  departmentId?: string | null;
  attendees?: string | null; // JSON string array of employee IDs
  relatedTaskId?: string | null;
  creator?: { firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const STORE_FILE = path.join(DATA_DIR, "calendar-events.json");

// Preloaded corporate enterprise schedule
const SEED_EVENTS: StoredCalendarEvent[] = [
  {
    id: "evt_q4_exec_review",
    organizationId: "org_nfvs_studio",
    creatorId: "emp_nfvs_coo",
    title: "Executive Operations & Performance Review",
    description: "Bi-weekly executive operational sync on venture portfolio delivery and cross-functional KPIs.",
    type: "MEETING",
    startDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 1 * 86400000 + 3600000).toISOString(),
    isAllDay: false,
    location: "Executive Boardroom A (Floor 4) & Virtual",
    meetUrl: "https://meet.nfvs.internal/ops-exec",
    departmentId: "dept_ops",
    attendees: JSON.stringify(["emp_nfvs_coo", "emp_nfvs_gouri_029"]),
    creator: { firstName: "Operations", lastName: "Director" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt_all_hands_q4",
    organizationId: "org_nfvs_studio",
    creatorId: "emp_nfvs_ceo",
    title: "Global All-Hands & Venture Studio Townhall",
    description: "Company-wide presentation on upcoming product launches, social impact milestones, and employee recognitions.",
    type: "COMPANY_EVENT",
    startDate: new Date(Date.now() + 4 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 4 * 86400000 + 7200000).toISOString(),
    isAllDay: false,
    location: "Main Auditorium & Global Zoom Room",
    meetUrl: "https://meet.nfvs.internal/townhall",
    departmentId: null,
    creator: { firstName: "Chief", lastName: "Executive" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt_client_demo_vertex",
    organizationId: "org_nfvs_studio",
    creatorId: "emp_nfvs_coo",
    title: "Enterprise Client Demo: Strategic Supply Chain Partner",
    description: "Demonstration of CRM enterprise logistics portal and inventory automation pipeline.",
    type: "CLIENT_MEETING",
    startDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    isAllDay: false,
    location: "Client Relations Suite (Level 2)",
    meetUrl: "https://meet.nfvs.internal/client-demo",
    creator: { firstName: "Operations", lastName: "Director" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt_tech_sync_arch",
    organizationId: "org_nfvs_studio",
    creatorId: "emp_nfvs_cto",
    title: "Engineering Architecture & Cloud Security Sync",
    description: "Architecture sync discussing database resilience, audit trail isolation, and latency improvements.",
    type: "MEETING",
    startDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(),
    isAllDay: false,
    location: "Engineering Innovation Hub (Floor 3)",
    meetUrl: "https://meet.nfvs.internal/eng-sync",
    departmentId: "dept_eng",
    creator: { firstName: "Technology", lastName: "Director" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt_statutory_gst",
    organizationId: "org_nfvs_studio",
    creatorId: "emp_nfvs_cfo",
    title: "Statutory Tax & Compliance Filing Deadline",
    description: "Monthly GST, TDS reconciliation, and statutory auditor sign-off.",
    type: "DEADLINE",
    startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    isAllDay: true,
    location: "Finance & Accounts Wing",
    creator: { firstName: "Finance", lastName: "Director" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt_national_youth_day",
    organizationId: "org_nfvs_studio",
    creatorId: "emp_nfvs_hr",
    title: "National Innovation & Social Impact Observance",
    description: "Observance of national youth empowerment in entrepreneurship and grassroots venture building.",
    type: "CURRENT_AFFAIR",
    startDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    isAllDay: true,
    location: "Campus-Wide",
    creator: { firstName: "HR", lastName: "Officer" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class CalendarStore {
  private static ensureDataFile(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(STORE_FILE)) {
        fs.writeFileSync(STORE_FILE, JSON.stringify(SEED_EVENTS, null, 2), "utf-8");
      }
    } catch (e) {
      console.error("[CalendarStore Error] Could not ensure data directory/file:", e);
    }
  }

  static getAll(): StoredCalendarEvent[] {
    try {
      this.ensureDataFile();
      if (!fs.existsSync(STORE_FILE)) {
        return SEED_EVENTS;
      }
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_EVENTS;
    } catch {
      return SEED_EVENTS;
    }
  }

  static saveAll(events: StoredCalendarEvent[]): void {
    try {
      this.ensureDataFile();
      fs.writeFileSync(STORE_FILE, JSON.stringify(events, null, 2), "utf-8");
    } catch (e) {
      console.error("[CalendarStore Error] Failed to write calendar-events.json:", e);
    }
  }

  static getById(id: string): StoredCalendarEvent | null {
    const all = this.getAll();
    return all.find((e) => e.id === id) || null;
  }

  static getByOrgAndDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): StoredCalendarEvent[] {
    const all = this.getAll();
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return all.filter((ev) => {
      // Allow org match or events with no specific org constraint
      const orgMatch =
        !ev.organizationId ||
        ev.organizationId === organizationId ||
        ev.organizationId.includes("nfvs") === organizationId.includes("nfvs");

      if (!orgMatch) return false;

      const evStart = new Date(ev.startDate).getTime();
      const evEnd = new Date(ev.endDate).getTime();

      // Check date overlap
      return evStart <= endMs && evEnd >= startMs;
    });
  }

  static create(data: Partial<StoredCalendarEvent>): StoredCalendarEvent {
    const all = this.getAll();
    const now = new Date().toISOString();
    const id = data.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newEvent: StoredCalendarEvent = {
      id,
      organizationId: data.organizationId || "org_nfvs_studio",
      creatorId: data.creatorId || "emp_system",
      title: data.title || "Scheduled Meeting",
      description: data.description || null,
      type: data.type || "MEETING",
      startDate: data.startDate || now,
      endDate: data.endDate || new Date(Date.now() + 3600000).toISOString(),
      isAllDay: data.isAllDay || false,
      location: data.location || null,
      meetUrl: data.meetUrl || null,
      departmentId: data.departmentId || null,
      attendees: data.attendees || null,
      relatedTaskId: data.relatedTaskId || null,
      creator: data.creator || { firstName: "Operations", lastName: "Director" },
      createdAt: now,
      updatedAt: now,
    };

    all.unshift(newEvent);
    this.saveAll(all);
    return newEvent;
  }

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
