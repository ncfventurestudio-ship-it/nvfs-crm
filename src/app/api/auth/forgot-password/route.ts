import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { EmailService } from "@/services/email.service";
import { AuditService } from "@/services/audit.service";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PasswordResetsStore } from "@/lib/password-resets-store";
import { findRegisteredEmployee } from "@/lib/employee-directory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawIdentifier = (body.identifier || body.email || body.employeeNumber || "").trim();
    const note = (body.note || body.reason || "").trim();

    if (!rawIdentifier) {
      return errorResponse("Please enter your Employee ID or corporate email address.", "VALIDATION_ERROR", 400);
    }

    // 1. Strict Registration Check: Must be an existing registered employee in the CRM
    const employee = await findRegisteredEmployee(rawIdentifier);

    if (!employee) {
      return errorResponse(
        `No employee record found for "${rawIdentifier}". Only registered workforce members can request password recovery. If you are a new team member, please contact your Human Resources department for account provisioning.`,
        "NOT_FOUND",
        404
      );
    }

    // 2. Automated Company Identification & HR Routing (From Registered Record)
    const companyName = employee.companyName;
    const companyCode = employee.companyCode;
    const orgId = employee.organizationId;
    const designatedHrEmail = employee.designatedHrEmail;
    const employeeName = employee.fullName;
    const employeeNumber = employee.employeeNumber;
    const employeeEmail = employee.email;
    const designation = employee.designation;
    const departmentName = employee.departmentName;

    // 3. Dual-Storage: Save to persistent JSON store
    const storedRequest = PasswordResetsStore.create({
      title: `Password Reset Request - ${employeeName} (${employeeNumber})`,
      description: note || `Employee requested CRM password reset for ${companyName}.`,
      organizationId: orgId,
      companyCode,
      companyName,
      hrEmail: designatedHrEmail,
      employeeId: employee.id,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNumber,
        email: employeeEmail,
        designation,
        department: { id: `dept_${companyCode.toLowerCase()}`, name: departmentName },
        user: {
          id: `usr_${employee.id}`,
          email: employeeEmail,
          isActive: true,
          lastLoginAt: null,
        },
      },
      metadata: JSON.stringify({
        note,
        company: companyName,
        companyCode,
        requestedAt: new Date().toISOString(),
      }),
    });

    const requestNumber = storedRequest.requestNumber;

    // 4. Also record in DB if online
    try {
      await db.employeeRequest.create({
        data: {
          organizationId: orgId,
          requestNumber,
          category: "PASSWORD_RESET",
          title: `Password Reset Request - ${employeeName} (${employeeNumber})`,
          description: `Employee ${employeeName} (${employeeNumber}) requested a password reset for ${companyName}. Note: ${note || "User requested password reset via CRM portal."}`,
          status: "PENDING",
          employeeId: employee.id,
          metadata: JSON.stringify({
            type: "PASSWORD_RESET",
            employeeId: employee.id,
            employeeEmail,
            employeeName,
            employeeNumber,
            companyName,
            companyCode,
            designatedHrEmail,
            note,
            requestedAt: new Date().toISOString(),
          }),
        },
      });
    } catch (dbErr: any) {
      console.warn("[Forgot Password] Could not write to db.employeeRequest (relying on file store):", dbErr.message);
    }

    // 5. In-App Notification to Company HR
    try {
      const hrUsers = await db.user.findMany({
        where: {
          isActive: true,
          role: {
            code: { in: ["SUPER_ADMIN", "ADMIN", "HR", "CEO"] },
          },
        },
        select: { id: true, email: true },
      });

      if (hrUsers.length > 0) {
        await db.notification.createMany({
          data: hrUsers.map((hrUser) => ({
            organizationId: orgId,
            userId: hrUser.id,
            type: "PASSWORD_RESET_REQUEST",
            title: `🔑 [${companyName}] Password Reset: ${employeeName}`,
            message: `Employee ${employeeName} (${employeeNumber}) of ${companyName} requested a password reset. Note: "${note || "Standard recovery"}". Click to assign credentials.`,
            priority: "HIGH",
            actionUrl: `/app/hr/password-resets?requestId=${storedRequest.id}`,
          })),
        });
      }
    } catch {}

    // 6. Forward Email to Designated HR of Company A or Company B
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "");
    const hrActionUrl = `${appUrl}/app/hr/password-resets?requestId=${storedRequest.id}`;

    const hrEmailResult = await EmailService.sendPasswordResetAlertToHr({
      hrEmail: designatedHrEmail,
      employeeName,
      employeeNumber,
      employeeEmail,
      designation,
      departmentName,
      companyName,
      companyCode,
      note,
      actionUrl: hrActionUrl,
    });

    // 7. Acknowledgment email to employee
    if (employeeEmail) {
      await EmailService.sendPasswordResetRequestAckToEmployee({
        employeeName,
        employeeEmail,
        employeeNumber,
        companyName,
        requestNumber,
      }).catch(() => {});
    }

    // 8. Audit Logging
    try {
      AuditService.logMutation({
        actorId: employee.id,
        action: "PASSWORD_RESET_REQUESTED",
        entity: "Employee",
        entityId: employee.id,
        newValue: {
          identifier: rawIdentifier,
          company: companyName,
          companyCode,
          requestNumber,
          hrAlerted: hrEmailResult.success,
          designatedHrEmail,
        },
      }).catch(() => {});
    } catch {}

    return successResponse({
      requestNumber,
      employeeName,
      employeeNumber,
      companyName,
      companyCode,
      designatedHrEmail,
      employeeEmail: employeeEmail ? `${employeeEmail.slice(0, 3)}***@${employeeEmail.split("@")[1] || ""}` : null,
      hrNotified: true,
      emailDispatched: hrEmailResult.success,
      simulated: hrEmailResult.simulated,
      message: `Your request has been verified and routed to ${companyName} HR (${designatedHrEmail}).`,
    });
  } catch (error: any) {
    console.error("[Forgot Password API Error]:", error);
    return errorResponse(error.message || "Failed to process password recovery request", "INTERNAL_ERROR", 500);
  }
}
