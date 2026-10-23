import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { EmployeeOnboardingService } from "@/services/employee-onboarding.service";
import { db } from "@/lib/db";
import { EmployeeStore } from "@/lib/employee-store";
import { getOfflinePersonaEmployee } from "@/lib/offline-auth";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

const addDocJsonSchema = z.object({
  type: z.string().min(1, "Document type is required"),
  title: z.string().min(1, "Document title is required"),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File content/URL is required"),
  fileSize: z.number().optional().default(1024),
  mimeType: z.string().optional().default("application/pdf"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    let documents: any[] = [];
    try {
      documents = await db.employeeDocument.findMany({
        where: { employeeId: id },
        orderBy: { uploadedAt: "desc" },
      });
    } catch {
      const stored =
        EmployeeStore.getById(id) ||
        EmployeeStore.findByEmailOrNumber(id) ||
        getOfflinePersonaEmployee(id);
      documents = stored?.documents || [];
    }

    return successResponse(documents);
  } catch (error: any) {
    console.error("[Employee Documents GET Error]:", error);
    return errorResponse(error.message || "Failed to fetch documents", "INTERNAL_ERROR", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;

    // Check if the employee exists
    let employee: any = null;
    try {
      employee = await db.employee.findUnique({ where: { id } });
    } catch {}

    if (!employee) {
      employee =
        EmployeeStore.getById(id) ||
        EmployeeStore.findByEmailOrNumber(id) ||
        getOfflinePersonaEmployee(id);
    }

    if (!employee) {
      return errorResponse("Employee not found", "NOT_FOUND", 404);
    }

    const contentType = req.headers.get("content-type") || "";

    // 1. Handle Multipart Form-Data (Actual File Soft Copy Upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const type = (formData.get("type") as string) || "OTHER";
      const title = (formData.get("title") as string)?.trim() || (file ? file.name : "Document");

      if (!file) {
        return errorResponse("Please select a document file to upload", "VALIDATION_ERROR", 400);
      }

      // Enforce 10MB limit
      if (file.size > MAX_FILE_SIZE) {
        const receivedMb = (file.size / (1024 * 1024)).toFixed(2);
        return errorResponse(
          `Document file size (${receivedMb} MB) exceeds maximum allowed limit of 10 MB.`,
          "FILE_TOO_LARGE",
          400
        );
      }

      const originalName = file.name || "document.pdf";
      const ext = path.extname(originalName) || ".pdf";
      const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
      const uniqueFileName = `${Date.now()}_${baseName}${ext}`;

      // Store in public/uploads/employee-documents/[employeeId]/
      const targetDir = path.join(process.cwd(), "public", "uploads", "employee-documents", id);
      await fs.mkdir(targetDir, { recursive: true });

      const targetFilePath = path.join(targetDir, uniqueFileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(targetFilePath, buffer);

      const fileUrl = `/uploads/employee-documents/${id}/${uniqueFileName}`;
      const mimeType = file.type || "application/octet-stream";

      const doc = await EmployeeOnboardingService.addDocument(id, {
        type,
        title,
        fileName: originalName,
        fileUrl,
        fileSize: file.size,
        mimeType,
      });

      return successResponse(doc, 201);
    }

    // 2. Handle JSON payload (Fallback)
    const body = await req.json();
    const parse = addDocJsonSchema.safeParse(body);

    if (!parse.success) {
      return errorResponse(parse.error.issues[0].message, "VALIDATION_ERROR", 400);
    }

    if (parse.data.fileSize && parse.data.fileSize > MAX_FILE_SIZE) {
      return errorResponse("Document file size exceeds maximum allowed limit of 10 MB.", "FILE_TOO_LARGE", 400);
    }

    const doc = await EmployeeOnboardingService.addDocument(id, parse.data);

    return successResponse(doc, 201);
  } catch (error: any) {
    console.error("[Employee Documents POST Error]:", error);
    return errorResponse(error.message || "Failed to upload document", "INTERNAL_ERROR", 500);
  }
}
