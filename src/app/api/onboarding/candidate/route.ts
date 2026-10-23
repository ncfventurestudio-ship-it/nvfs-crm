import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const prisma = new PrismaClient();

const candidateSubmissionSchema = z.object({
  orgCode: z.string().optional().default("NFVS"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email address is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  aadhaarNumber: z.string().min(4, "Aadhaar number is required"),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  bloodGroup: z.string().optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional().default("India"),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  highestDegree: z.string().optional(),
  institution: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parse = candidateSubmissionSchema.safeParse(body);
    if (!parse.success) {
      return errorResponse(parse.error.issues[0].message, "VALIDATION_ERROR", 400);
    }

    const {
      orgCode,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      aadhaarNumber,
      gender,
      maritalStatus,
      bloodGroup,
      currentAddress,
      permanentAddress,
      city,
      state,
      postalCode,
      country,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      highestDegree,
      institution,
      notes,
    } = parse.data;

    const normalizedEmail = email.trim().toLowerCase();

    // Resolve target organization
    let org = null;
    if (orgCode) {
      const codeUpper = orgCode.trim().toUpperCase();
      if (codeUpper === "NF" || codeUpper === "NAREE") {
        org = await db.organization.findFirst({
          where: {
            OR: [
              { code: "NAREE" },
              { name: { contains: "Naree Foundation", mode: "insensitive" } },
            ],
          },
        });
      } else {
        org = await db.organization.findFirst({
          where: {
            OR: [
              { code: "NFVS" },
              { name: { contains: "Venture Studio", mode: "insensitive" } },
            ],
          },
        });
      }
    }

    if (!org) {
      org = await db.organization.findFirst();
    }

    if (!org) {
      return errorResponse("System organization configuration missing", "INTERNAL_ERROR", 500);
    }

    // Check if candidate already has an active employee record
    const existingEmployee = await db.employee.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmployee) {
      return errorResponse(
        `An employee account with email ${normalizedEmail} already exists in the system. Please reach out to HR if you need password recovery.`,
        "ALREADY_EXISTS",
        400
      );
    }

    // Parse date of birth
    let parsedDob: Date | null = null;
    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      if (!isNaN(d.getTime())) {
        parsedDob = d;
      }
    }

    // Clean Aadhaar (preserve formatting or digits)
    const cleanAadhaar = aadhaarNumber ? aadhaarNumber.replace(/[^\d\s]/g, "").trim() : null;

    // Check if an existing pending submission exists for this email
    const existingSubmission = await prisma.preOnboardingSubmission.findFirst({
      where: {
        email: normalizedEmail,
        status: "PENDING_REVIEW",
      },
    });

    let submissionRecord;
    if (existingSubmission) {
      // Update existing pending submission
      submissionRecord = await prisma.preOnboardingSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          organizationId: org.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() || null,
          dateOfBirth: parsedDob,
          aadhaarNumber: cleanAadhaar,
          gender: gender || null,
          maritalStatus: maritalStatus || null,
          bloodGroup: bloodGroup || null,
          currentAddress: currentAddress?.trim() || null,
          permanentAddress: permanentAddress?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          postalCode: postalCode?.trim() || null,
          country: country || "India",
          emergencyContactName: emergencyContactName?.trim() || null,
          emergencyContactPhone: emergencyContactPhone?.trim() || null,
          emergencyContactRelation: emergencyContactRelation?.trim() || null,
          highestDegree: highestDegree?.trim() || null,
          institution: institution?.trim() || null,
          notes: notes?.trim() || null,
          updatedAt: new Date(),
        },
      });
    } else {
      submissionRecord = await prisma.preOnboardingSubmission.create({
        data: {
          organizationId: org.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          dateOfBirth: parsedDob,
          aadhaarNumber: cleanAadhaar,
          gender: gender || null,
          maritalStatus: maritalStatus || null,
          bloodGroup: bloodGroup || null,
          currentAddress: currentAddress?.trim() || null,
          permanentAddress: permanentAddress?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          postalCode: postalCode?.trim() || null,
          country: country || "India",
          emergencyContactName: emergencyContactName?.trim() || null,
          emergencyContactPhone: emergencyContactPhone?.trim() || null,
          emergencyContactRelation: emergencyContactRelation?.trim() || null,
          highestDegree: highestDegree?.trim() || null,
          institution: institution?.trim() || null,
          notes: notes?.trim() || null,
          status: "PENDING_REVIEW",
        },
      });
    }

    return successResponse(
      {
        id: submissionRecord.id,
        email: submissionRecord.email,
        companyName: org.name,
        message:
          "Your pre-onboarding form has been successfully transmitted to the HR Department. You will receive an official email with your corporate login credentials once approved.",
      },
      201
    );
  } catch (err: any) {
    console.error("[Candidate Pre-Onboarding Submission Error]:", err);
    return errorResponse(
      err.message || "Failed to submit candidate onboarding form",
      "INTERNAL_ERROR",
      500
    );
  }
}
