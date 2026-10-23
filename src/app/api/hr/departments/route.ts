import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

const DEFAULT_DEPARTMENTS = [
  { name: "Executive Leadership", code: "EXEC", description: "Governance, executive strategy, and corporate vision" },
  { name: "Software Department & IT", code: "SW", description: "Software development, web applications, and IT systems" },
  { name: "Technology & Engineering", code: "ENG", description: "Cloud infrastructure, systems architecture, and cybersecurity" },
  { name: "Product & UX Design", code: "PROD", description: "Product roadmap, user experience, and feature design" },
  { name: "Human Resources", code: "HR", description: "People operations, talent acquisition, leaves, and workplace culture" },
  { name: "Finance & Treasury", code: "FIN", description: "Financial reporting, treasury, tax compliance, and payroll" },
  { name: "Commercial & Sales", code: "CRM", description: "Enterprise client relations, deals, and market growth" },
  { name: "Operations & Logistics", code: "OPS", description: "Execution delivery, missions, and international relations" },
  { name: "Legal & Compliance", code: "LEG", description: "Corporate contracts, statutory governance, and regulatory filings" },
  { name: "Quality Assurance & Testing", code: "QA", description: "Software QA, automated testing, and release validation" },
  { name: "Customer Support & Success", code: "CS", description: "Client onboarding, technical support, and account management" },
  { name: "Marketing & Growth", code: "MKT", description: "Brand marketing, lead generation, and public relations" },
  { name: "Research & Development", code: "RND", description: "Innovation research, AI models, and technology prototypes" },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(req.url);
    const targetOrgId =
      searchParams.get("organizationId") ||
      req.headers.get("x-company-id") ||
      user.activeCompany?.id ||
      user.employee?.organizationId;

    const org = targetOrgId
      ? await db.organization.findUnique({ where: { id: targetOrgId } })
      : await db.organization.findFirst();

    if (!org) {
      return errorResponse("No organization found", "INTERNAL_ERROR", 500);
    }

    // Check existing departments
    let departments = await db.department.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { employees: true } },
      },
    });

    // Ensure default departments are present if missing
    for (const d of DEFAULT_DEPARTMENTS) {
      const exists = departments.some((dept) => dept.code === d.code || dept.name === d.name);
      if (!exists) {
        await db.department.create({
          data: {
            organizationId: org.id,
            name: d.name,
            code: d.code,
            description: d.description,
          },
        });
      }
    }

    // Re-fetch sorted departments
    departments = await db.department.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { employees: true } },
      },
    });

    return successResponse(departments);
  } catch (error: any) {
    console.warn("[Departments GET Warning] Database query failed (cloud database may be paused):", error.message);
    const fallbackDepartments = DEFAULT_DEPARTMENTS.map((d, index) => ({
      id: `dept_${d.code.toLowerCase()}_${index}`,
      name: d.name,
      code: d.code,
      description: d.description,
      _count: { employees: 0 },
    }));
    return successResponse(fallbackDepartments);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    if (!body.name || !body.code) {
      return errorResponse("Department name and code are required", "VALIDATION_ERROR", 400);
    }

    const org = await db.organization.findFirst();
    if (!org) {
      return errorResponse("No organization found", "INTERNAL_ERROR", 500);
    }

    const department = await db.department.create({
      data: {
        organizationId: org.id,
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        description: body.description?.trim() || null,
      },
    });

    return successResponse(department, 201);
  } catch (error: any) {
    console.error("[Departments POST Error]:", error);
    return errorResponse(error.message || "Failed to create department", "INTERNAL_ERROR", 400);
  }
}
