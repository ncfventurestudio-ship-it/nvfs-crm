import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { AuditService } from "@/services/audit.service";
import { NotificationService } from "@/services/notification.service";
import { EmployeeStore, StoredEmployee } from "@/lib/employee-store";
import { getOfflinePersonaEmployee } from "@/lib/offline-auth";

export interface SectionStatus {
  id: string;
  name: string;
  weight: number;
  completed: boolean;
  score: number;
  missingFields: string[];
}

export interface ProfileCompletionResult {
  totalScore: number;
  isComplete: boolean;
  sections: SectionStatus[];
  allDocumentsVerified: boolean;
  canApprove: boolean;
}

export class EmployeeOnboardingService {
  /**
   * Calculates dynamic profile completion across all 10 standard organizational sections
   */
  static calculateCompletion(
    employee: any,
    profile: any | null,
    documents: any[] = [],
    user: any | null = null
  ): ProfileCompletionResult {
    const prof = profile || {};
    const docs = documents || [];

    // 1. Personal Information (10%)
    const personalMissing: string[] = [];
    if (!employee.firstName) personalMissing.push("First Name");
    if (!employee.lastName) personalMissing.push("Last Name");
    if (!prof.dateOfBirth) personalMissing.push("Date of Birth");
    if (!prof.gender) personalMissing.push("Gender");
    if (!prof.maritalStatus) personalMissing.push("Marital Status");
    if (!prof.bloodGroup) personalMissing.push("Blood Group");
    if (!prof.nationality) personalMissing.push("Nationality");
    const personalComplete = personalMissing.length === 0;
    const personalScore = personalComplete ? 10 : Math.max(0, Math.round(((7 - personalMissing.length) / 7) * 10));

    // 2. Employment Information (10%)
    const employmentMissing: string[] = [];
    if (!employee.designation) employmentMissing.push("Designation");
    if (!employee.departmentId) employmentMissing.push("Department");
    if (!employee.hireDate) employmentMissing.push("Hire Date");
    if (!employee.employmentType) employmentMissing.push("Employment Type");
    if (!employee.workMode) employmentMissing.push("Work Mode");
    if (!employee.location) employmentMissing.push("Work Location");
    const employmentComplete = employmentMissing.length === 0;
    const employmentScore = employmentComplete ? 10 : Math.max(0, Math.round(((6 - employmentMissing.length) / 6) * 10));

    // 3. Contact & Address (10%)
    const contactMissing: string[] = [];
    if (!prof.currentAddress) contactMissing.push("Current Address");
    if (!prof.city) contactMissing.push("City");
    if (!prof.state) contactMissing.push("State / Province");
    if (!prof.postalCode) contactMissing.push("Postal Code");
    if (!employee.phone && !prof.alternatePhone) contactMissing.push("Contact Phone");
    if (!prof.personalEmail) contactMissing.push("Personal Email");
    const contactComplete = contactMissing.length === 0;
    const contactScore = contactComplete ? 10 : Math.max(0, Math.round(((6 - contactMissing.length) / 6) * 10));

    // 4. Government IDs (10%)
    const govMissing: string[] = [];
    if (!prof.panNumber && !prof.aadhaarNumber && !prof.passportNumber && !prof.ssnOrNationalId && !prof.taxId) {
      govMissing.push("At least one Government ID (PAN, Aadhaar, Passport, or Tax ID)");
    }
    const govComplete = govMissing.length === 0;
    const govScore = govComplete ? 10 : 0;

    // 5. Bank / Payroll (10%)
    const bankMissing: string[] = [];
    if (!prof.bankName) bankMissing.push("Bank Name");
    if (!prof.accountHolderName) bankMissing.push("Account Holder Name");
    if (!prof.accountNumber) bankMissing.push("Account Number");
    if (!prof.ifscOrRoutingCode) bankMissing.push("IFSC / Routing Code");
    const bankComplete = bankMissing.length === 0;
    const bankScore = bankComplete ? 10 : Math.max(0, Math.round(((4 - bankMissing.length) / 4) * 10));

    // 6. Emergency Contact (10%)
    const emergencyMissing: string[] = [];
    const primName = prof.primaryContactName || employee.emergencyContact;
    if (!primName) emergencyMissing.push("Primary Contact Name");
    if (!prof.primaryContactPhone) emergencyMissing.push("Primary Contact Phone");
    if (!prof.primaryContactRelation) emergencyMissing.push("Primary Relationship");
    const emergencyComplete = emergencyMissing.length === 0;
    const emergencyScore = emergencyComplete ? 10 : Math.max(0, Math.round(((3 - emergencyMissing.length) / 3) * 10));

    // 7. Education (10%)
    const eduMissing: string[] = [];
    if (!prof.highestDegree) eduMissing.push("Highest Degree / Qualification");
    if (!prof.institution) eduMissing.push("College / University");
    if (!prof.graduationYear) eduMissing.push("Graduation Year");
    const eduComplete = eduMissing.length === 0;
    const eduScore = eduComplete ? 10 : Math.max(0, Math.round(((3 - eduMissing.length) / 3) * 10));

    // 8. Professional Details (10%)
    const profMissing: string[] = [];
    if (!prof.skills || prof.skills.trim().length === 0) profMissing.push("Key Skills");
    if (prof.totalExperienceYears === null || prof.totalExperienceYears === undefined) {
      profMissing.push("Total Experience Years");
    }
    const profComplete = profMissing.length === 0;
    const profScore = profComplete ? 10 : Math.max(0, Math.round(((2 - profMissing.length) / 2) * 10));

    // 9. Documents (10%)
    const docMissing: string[] = [];
    if (docs.length === 0) {
      docMissing.push("Upload at least 1 identification document and 1 credential");
    } else if (docs.length < 2) {
      docMissing.push("Upload at least 2 verification documents");
    }
    const docComplete = docs.length >= 2;
    const docScore = docComplete ? 10 : (docs.length === 1 ? 5 : 0);

    // 10. Access & Permissions (10%)
    const accessMissing: string[] = [];
    if (!employee.userId && !user) {
      accessMissing.push("CRM User Account");
    }
    const roleCode = user?.role?.code || employee.user?.role?.code;
    if (!roleCode) {
      accessMissing.push("Role & Permissions assignment");
    }
    const accessComplete = accessMissing.length === 0;
    const accessScore = accessComplete ? 10 : (employee.userId ? 5 : 0);

    const sections: SectionStatus[] = [
      { id: "personal", name: "Personal Information", weight: 10, completed: personalComplete, score: personalScore, missingFields: personalMissing },
      { id: "employment", name: "Employment Information", weight: 10, completed: employmentComplete, score: employmentScore, missingFields: employmentMissing },
      { id: "contact", name: "Contact & Address", weight: 10, completed: contactComplete, score: contactScore, missingFields: contactMissing },
      { id: "government", name: "Government IDs", weight: 10, completed: govComplete, score: govScore, missingFields: govMissing },
      { id: "payroll", name: "Bank / Payroll", weight: 10, completed: bankComplete, score: bankScore, missingFields: bankMissing },
      { id: "emergency", name: "Emergency Contact", weight: 10, completed: emergencyComplete, score: emergencyScore, missingFields: emergencyMissing },
      { id: "education", name: "Education", weight: 10, completed: eduComplete, score: eduScore, missingFields: eduMissing },
      { id: "professional", name: "Professional Details", weight: 10, completed: profComplete, score: profScore, missingFields: profMissing },
      { id: "documents", name: "Documents", weight: 10, completed: docComplete, score: docScore, missingFields: docMissing },
      { id: "access", name: "Access & Permissions", weight: 10, completed: accessComplete, score: accessScore, missingFields: accessMissing },
    ];

    const totalScore = sections.reduce((acc, s) => acc + s.score, 0);
    const allDocumentsVerified = docs.length > 0 && docs.every((d) => d.verificationStatus === "VERIFIED");
    const isComplete = totalScore >= 80;
    const canApprove = totalScore >= 70;

    return {
      totalScore,
      isComplete,
      sections,
      allDocumentsVerified,
      canApprove,
    };
  }

  /**
   * Retrieves the full employee dossier with profile, documents, and dynamic completion
   */
  static async getEmployeeDossier(employeeId: string) {
    let employee: any = null;

    // 1. Try querying database if available
    try {
      employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: {
          organization: true,
          department: true,
          team: true,
          manager: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              designation: true,
              email: true,
            },
          },
          user: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
              memberships: {
                include: {
                  organization: true,
                  role: true,
                },
              },
            },
          },
          profile: true,
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
        },
      });
    } catch (dbErr: any) {
      console.warn(
        `[getEmployeeDossier] Database unavailable (${dbErr.message}), falling back to offline employee store for [${employeeId}].`
      );
    }

    // 2. If not found in DB or DB offline, resolve from resilient EmployeeStore / Persona
    if (!employee) {
      const stored =
        EmployeeStore.getById(employeeId) ||
        EmployeeStore.findByEmailOrNumber(employeeId) ||
        getOfflinePersonaEmployee(employeeId);

      if (stored) {
        employee = {
          id: stored.id,
          employeeNumber: stored.employeeNumber,
          firstName: stored.firstName,
          lastName: stored.lastName,
          email: stored.email,
          phone: stored.phone || null,
          designation: stored.designation,
          departmentId: stored.departmentId || null,
          department: stored.department || {
            id: stored.departmentId || "dept_gen",
            name: "General Operations",
            code: "GEN",
          },
          teamId: stored.teamId || null,
          team: stored.team || null,
          managerId: stored.managerId || null,
          manager: stored.manager || null,
          organizationId: stored.organizationId,
          organization: stored.organization || {
            id: stored.organizationId,
            name: "Naree Foundation Venture Studio (NFVS)",
            code: "NFVS-STUDIO",
            primaryColor: "#2563eb",
          },
          employmentType: stored.employmentType || "FULL_TIME",
          employmentStatus: stored.employmentStatus || "ACTIVE",
          workMode: stored.workMode || "HYBRID",
          location: stored.location || "Headquarters (Mumbai)",
          emergencyContact: stored.emergencyContact || null,
          hireDate: stored.hireDate ? new Date(stored.hireDate) : new Date("2024-01-01"),
          onboardingStatus: stored.onboardingStatus || "COMPLETED",
          profileCompletion: stored.profileCompletion ?? 100,
          approvalNotes: stored.approvalNotes || null,
          approvedAt: stored.approvedAt ? new Date(stored.approvedAt) : null,
          approvedBy: stored.approvedBy || null,
          userId: stored.user?.id || `usr_${stored.id}`,
          user: stored.user
            ? {
                id: stored.user.id,
                email: stored.user.email || stored.email,
                isActive: stored.user.isActive ?? true,
                role: {
                  id: stored.user.role.id || `role_${stored.user.role.code.toLowerCase()}`,
                  code: stored.user.role.code,
                  name: stored.user.role.name,
                  level: stored.user.role.level || 50,
                  rolePermissions: [],
                },
                memberships: (stored.user as any).memberships || [],
              }
            : null,
          profile: stored.profile || {
            personalEmail: stored.email,
            country: "India",
            nationality: "Indian",
          },
          documents: stored.documents || [],
        };
      }
    }

    if (!employee) {
      return null;
    }

    // If profile doesn't exist, ensure an empty profile is created
    if (!employee.profile) {
      try {
        const createdProfile = await db.employeeProfile.create({
          data: {
            employeeId: employee.id,
            personalEmail: employee.email,
            country: "India",
          },
        });
        employee.profile = createdProfile;
      } catch {
        employee.profile = {
          employeeId: employee.id,
          personalEmail: employee.email,
          country: "India",
          nationality: "Indian",
        };
      }
    }

    const completion = this.calculateCompletion(
      employee,
      employee.profile,
      employee.documents,
      employee.user
    );

    // Keep employee.profileCompletion synced if it differs
    if (employee.profileCompletion !== completion.totalScore) {
      employee.profileCompletion = completion.totalScore;
      try {
        await db.employee.update({
          where: { id: employee.id },
          data: { profileCompletion: completion.totalScore },
        });
      } catch {
        EmployeeStore.update(employee.id, { profileCompletion: completion.totalScore });
      }
    }

    return {
      employee,
      completion,
    };
  }

  /**
   * Updates employee profile details and synchronizes status & completion score
   */
  static async updateEmployeeProfile(employeeId: string, payload: any, actorUserId?: string) {
    const {
      // 1. Personal Information
      dateOfBirth,
      gender,
      maritalStatus,
      bloodGroup,
      nationality,
      fatherOrSpouseName,
      bio,

      // 2. Employment fields that reside on Employee model
      designation,
      departmentId,
      teamId,
      managerId,
      employmentType,
      workMode,
      location,
      hireDate,
      phone,

      // 3. Contact & Address
      currentAddress,
      permanentAddress,
      personalEmail,
      alternatePhone,
      city,
      state,
      postalCode,
      country,

      // 4. Government IDs
      panNumber,
      aadhaarNumber,
      passportNumber,
      passportExpiry,
      ssnOrNationalId,
      taxId,

      // 5. Bank / Payroll
      bankName,
      accountHolderName,
      accountNumber,
      ifscOrRoutingCode,
      branchName,
      accountType,
      upiId,

      // 6. Emergency Contact
      primaryContactName,
      primaryContactRelation,
      primaryContactPhone,
      secondaryContactName,
      secondaryContactRelation,
      secondaryContactPhone,

      // 7. Education
      highestDegree,
      institution,
      fieldOfStudy,
      graduationYear,
      gradeOrGpa,
      certifications,

      // 0. Primary Personnel Identity & Account info
      firstName,
      lastName,
      email,
      emergencyContact,
      roleCode,
      loginPassword,
      newPassword,
      isUserActive,
      createSystemAccount,

      // 8. Professional Details
      previousEmployer,
      previousDesignation,
      totalExperienceYears,
      skills,
      linkedinUrl,
      portfolioUrl,
    } = payload;

    // 1. Try DB lookup
    let currentEmp: any = null;
    try {
      currentEmp = await db.employee.findUnique({
        where: { id: employeeId },
        include: { user: true },
      });
    } catch (e: any) {
      console.warn(`[updateEmployeeProfile] DB lookup failed (${e.message})`);
    }

    if (!currentEmp) {
      return this.updateOfflineEmployeeProfile(employeeId, payload);
    }

    // Update Employee core fields if provided
    const employeeUpdateData: any = {};
    if (firstName !== undefined && typeof firstName === "string" && firstName.trim()) {
      employeeUpdateData.firstName = firstName.trim();
    }
    if (lastName !== undefined && typeof lastName === "string" && lastName.trim()) {
      employeeUpdateData.lastName = lastName.trim();
    }
    if (email !== undefined && typeof email === "string" && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== currentEmp.email) {
        const dup = await db.employee.findFirst({
          where: { email: cleanEmail, NOT: { id: employeeId } },
        });
        if (dup) {
          throw new Error(`Email [${cleanEmail}] is already assigned to another employee (${dup.firstName} ${dup.lastName})`);
        }
        employeeUpdateData.email = cleanEmail;
      }
    }
    if (phone !== undefined) employeeUpdateData.phone = phone;
    if (designation !== undefined && typeof designation === "string" && designation.trim()) {
      employeeUpdateData.designation = designation.trim();
    }
    if (departmentId !== undefined) employeeUpdateData.departmentId = departmentId || null;
    if (teamId !== undefined) employeeUpdateData.teamId = teamId || null;
    if (managerId !== undefined) employeeUpdateData.managerId = managerId || null;
    if (employmentType !== undefined) employeeUpdateData.employmentType = employmentType;
    if (workMode !== undefined) employeeUpdateData.workMode = workMode;
    if (location !== undefined) employeeUpdateData.location = location;
    if (hireDate !== undefined && hireDate) employeeUpdateData.hireDate = new Date(hireDate);
    if (emergencyContact !== undefined) {
      employeeUpdateData.emergencyContact = emergencyContact;
    } else if (primaryContactName !== undefined) {
      employeeUpdateData.emergencyContact = primaryContactName;
    }

    if (Object.keys(employeeUpdateData).length > 0) {
      await db.employee.update({
        where: { id: employeeId },
        data: employeeUpdateData,
      });
    }

    // Synchronize linked User account (Email, Role, Password, Active state)
    const effectiveEmail = employeeUpdateData.email || currentEmp.email;
    const pwd = (newPassword || loginPassword || "").trim();

    if (currentEmp.userId) {
      const userUpdateData: any = {};
      if (employeeUpdateData.email) {
        const dupUser = await db.user.findFirst({
          where: { email: employeeUpdateData.email, NOT: { id: currentEmp.userId } },
        });
        if (!dupUser) {
          userUpdateData.email = employeeUpdateData.email;
        }
      }
      if (roleCode && typeof roleCode === "string") {
        const targetRole = await db.role.findUnique({ where: { code: roleCode } });
        if (targetRole) {
          userUpdateData.roleId = targetRole.id;
          await db.userCompanyMembership.updateMany({
            where: { userId: currentEmp.userId, organizationId: currentEmp.organizationId },
            data: { roleId: targetRole.id },
          }).catch(() => {});
        }
      }
      if (pwd.length >= 6) {
        userUpdateData.passwordHash = await hashPassword(pwd);
      }
      if (isUserActive !== undefined) {
        userUpdateData.isActive = Boolean(isUserActive);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await db.user.update({
          where: { id: currentEmp.userId },
          data: userUpdateData,
        });
      }
    } else if (createSystemAccount || pwd.length >= 6) {
      // Create user account if employee currently doesn't have one
      const targetRoleCode = roleCode || "EMPLOYEE";
      let role = await db.role.findUnique({ where: { code: targetRoleCode } });
      if (!role) role = await db.role.findUnique({ where: { code: "EMPLOYEE" } });

      if (role && effectiveEmail) {
        const existingUser = await db.user.findUnique({ where: { email: effectiveEmail } });
        if (!existingUser) {
          const rawPassword = pwd.length >= 6 ? pwd : "Enterprise@2026";
          const passwordHash = await hashPassword(rawPassword);
          const createdUser = await db.user.create({
            data: {
              email: effectiveEmail,
              passwordHash,
              roleId: role.id,
              isActive: isUserActive !== undefined ? Boolean(isUserActive) : true,
            },
          });

          await db.employee.update({
            where: { id: employeeId },
            data: { userId: createdUser.id },
          });

          if (currentEmp.organizationId) {
            await db.userCompanyMembership.create({
              data: {
                userId: createdUser.id,
                organizationId: currentEmp.organizationId,
                roleId: role.id,
                status: "ACTIVE",
                isPrimary: true,
              },
            }).catch(() => {});
          }
        }
      }
    }

    // Upsert EmployeeProfile
    const profileData: any = {
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender ?? undefined,
      maritalStatus: maritalStatus ?? undefined,
      bloodGroup: bloodGroup ?? undefined,
      nationality: nationality ?? undefined,
      fatherOrSpouseName: fatherOrSpouseName ?? undefined,
      bio: bio ?? undefined,

      currentAddress: currentAddress ?? undefined,
      permanentAddress: permanentAddress ?? undefined,
      personalEmail: personalEmail ?? undefined,
      alternatePhone: alternatePhone ?? undefined,
      city: city ?? undefined,
      state: state ?? undefined,
      postalCode: postalCode ?? undefined,
      country: country ?? undefined,

      panNumber: panNumber ? panNumber.toUpperCase() : undefined,
      aadhaarNumber: aadhaarNumber ?? undefined,
      passportNumber: passportNumber ? passportNumber.toUpperCase() : undefined,
      passportExpiry: passportExpiry ? new Date(passportExpiry) : undefined,
      ssnOrNationalId: ssnOrNationalId ?? undefined,
      taxId: taxId ?? undefined,

      bankName: bankName ?? undefined,
      accountHolderName: accountHolderName ?? undefined,
      accountNumber: accountNumber ?? undefined,
      ifscOrRoutingCode: ifscOrRoutingCode ? ifscOrRoutingCode.toUpperCase() : undefined,
      branchName: branchName ?? undefined,
      accountType: accountType ?? undefined,
      upiId: upiId ?? undefined,

      primaryContactName: primaryContactName ?? undefined,
      primaryContactRelation: primaryContactRelation ?? undefined,
      primaryContactPhone: primaryContactPhone ?? undefined,
      secondaryContactName: secondaryContactName ?? undefined,
      secondaryContactRelation: secondaryContactRelation ?? undefined,
      secondaryContactPhone: secondaryContactPhone ?? undefined,

      highestDegree: highestDegree ?? undefined,
      institution: institution ?? undefined,
      fieldOfStudy: fieldOfStudy ?? undefined,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      gradeOrGpa: gradeOrGpa ?? undefined,
      certifications: certifications ?? undefined,

      previousEmployer: previousEmployer ?? undefined,
      previousDesignation: previousDesignation ?? undefined,
      totalExperienceYears: totalExperienceYears !== undefined ? Number(totalExperienceYears) : undefined,
      skills: Array.isArray(skills) ? skills.join(", ") : skills,
      linkedinUrl: linkedinUrl ?? undefined,
      portfolioUrl: portfolioUrl ?? undefined,
    };

    // Clean undefined keys
    Object.keys(profileData).forEach((key) => {
      if (profileData[key] === undefined) delete profileData[key];
    });

    const updatedProfile = await db.employeeProfile.upsert({
      where: { employeeId },
      create: {
        employeeId,
        ...profileData,
      },
      update: profileData,
    });

    // Re-fetch employee & docs to calculate fresh score
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        documents: true,
        user: { include: { role: true } },
      },
    });

    if (employee) {
      const completion = this.calculateCompletion(
        employee,
        updatedProfile,
        employee.documents,
        employee.user
      );

      // Determine appropriate onboarding lifecycle state
      let nextOnboardingStatus = employee.onboardingStatus;
      if (employee.onboardingStatus === "PENDING_PROFILE") {
        if (completion.totalScore >= 70) {
          nextOnboardingStatus = "PENDING_VERIFICATION";
        }
      } else if (employee.onboardingStatus === "PENDING_VERIFICATION") {
        if (completion.allDocumentsVerified && completion.canApprove) {
          nextOnboardingStatus = "PENDING_APPROVAL";
        }
      }

      await db.employee.update({
        where: { id: employee.id },
        data: {
          profileCompletion: completion.totalScore,
          onboardingStatus: nextOnboardingStatus,
        },
      });

      if (actorUserId) {
        await AuditService.logMutation({
          actorId: actorUserId,
          action: "EMPLOYEE_PROFILE_UPDATED",
          entity: "EmployeeProfile",
          entityId: employeeId,
          newValue: { completionScore: completion.totalScore, onboardingStatus: nextOnboardingStatus },
          metadata: { source: "complete_profile_workflow" },
        });
      }
    }

    return this.getEmployeeDossier(employeeId);
  }

  /**
   * Updates employee profile details in resilient offline EmployeeStore
   */
  static async updateOfflineEmployeeProfile(employeeId: string, payload: any) {
    let stored = EmployeeStore.getById(employeeId) || EmployeeStore.findByEmailOrNumber(employeeId);
    if (!stored) {
      stored = getOfflinePersonaEmployee(employeeId);
    }
    if (!stored) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    const {
      dateOfBirth,
      gender,
      maritalStatus,
      bloodGroup,
      nationality,
      fatherOrSpouseName,
      bio,
      designation,
      employmentType,
      workMode,
      location,
      phone,
      currentAddress,
      permanentAddress,
      personalEmail,
      alternatePhone,
      city,
      state,
      postalCode,
      country,
      panNumber,
      aadhaarNumber,
      passportNumber,
      passportExpiry,
      ssnOrNationalId,
      taxId,
      bankName,
      accountHolderName,
      accountNumber,
      ifscOrRoutingCode,
      branchName,
      accountType,
      upiId,
      primaryContactName,
      primaryContactRelation,
      primaryContactPhone,
      secondaryContactName,
      secondaryContactRelation,
      secondaryContactPhone,
      highestDegree,
      institution,
      fieldOfStudy,
      graduationYear,
      gradeOrGpa,
      certifications,
      firstName,
      lastName,
      emergencyContact,
      newPassword,
      previousEmployer,
      previousDesignation,
      totalExperienceYears,
      skills,
      linkedinUrl,
      portfolioUrl,
    } = payload;

    const existingProf = stored.profile || {};
    const updatedProf = {
      ...existingProf,
      dateOfBirth: dateOfBirth ?? existingProf.dateOfBirth,
      gender: gender ?? existingProf.gender,
      maritalStatus: maritalStatus ?? existingProf.maritalStatus,
      bloodGroup: bloodGroup ?? existingProf.bloodGroup,
      nationality: nationality ?? existingProf.nationality ?? "Indian",
      fatherOrSpouseName: fatherOrSpouseName ?? existingProf.fatherOrSpouseName,
      bio: bio ?? existingProf.bio,
      currentAddress: currentAddress ?? existingProf.currentAddress,
      permanentAddress: permanentAddress ?? existingProf.permanentAddress,
      personalEmail: personalEmail ?? existingProf.personalEmail ?? stored.email,
      alternatePhone: alternatePhone ?? existingProf.alternatePhone,
      city: city ?? existingProf.city,
      state: state ?? existingProf.state,
      postalCode: postalCode ?? existingProf.postalCode,
      country: country ?? existingProf.country ?? "India",
      panNumber: panNumber ? panNumber.toUpperCase() : existingProf.panNumber,
      aadhaarNumber: aadhaarNumber ? aadhaarNumber.replace(/\s+/g, "") : existingProf.aadhaarNumber,
      passportNumber: passportNumber ? passportNumber.toUpperCase() : existingProf.passportNumber,
      passportExpiry: passportExpiry ?? existingProf.passportExpiry,
      ssnOrNationalId: ssnOrNationalId ?? existingProf.ssnOrNationalId,
      taxId: taxId ?? existingProf.taxId,
      bankName: bankName ?? existingProf.bankName,
      accountHolderName: accountHolderName ?? existingProf.accountHolderName,
      accountNumber: accountNumber ?? existingProf.accountNumber,
      ifscOrRoutingCode: ifscOrRoutingCode ? ifscOrRoutingCode.toUpperCase() : existingProf.ifscOrRoutingCode,
      branchName: branchName ?? existingProf.branchName,
      accountType: accountType ?? existingProf.accountType,
      upiId: upiId ?? existingProf.upiId,
      primaryContactName: primaryContactName ?? existingProf.primaryContactName,
      primaryContactRelation: primaryContactRelation ?? existingProf.primaryContactRelation,
      primaryContactPhone: primaryContactPhone ?? existingProf.primaryContactPhone,
      secondaryContactName: secondaryContactName ?? existingProf.secondaryContactName,
      secondaryContactRelation: secondaryContactRelation ?? existingProf.secondaryContactRelation,
      secondaryContactPhone: secondaryContactPhone ?? existingProf.secondaryContactPhone,
      highestDegree: highestDegree ?? existingProf.highestDegree,
      institution: institution ?? existingProf.institution,
      fieldOfStudy: fieldOfStudy ?? existingProf.fieldOfStudy,
      graduationYear: graduationYear ? Number(graduationYear) : existingProf.graduationYear,
      gradeOrGpa: gradeOrGpa ?? existingProf.gradeOrGpa,
      certifications: certifications ?? existingProf.certifications,
      previousEmployer: previousEmployer ?? existingProf.previousEmployer,
      previousDesignation: previousDesignation ?? existingProf.previousDesignation,
      totalExperienceYears: totalExperienceYears !== undefined ? Number(totalExperienceYears) : existingProf.totalExperienceYears,
      skills: Array.isArray(skills) ? skills.join(", ") : (skills ?? existingProf.skills),
      linkedinUrl: linkedinUrl ?? existingProf.linkedinUrl,
      portfolioUrl: portfolioUrl ?? existingProf.portfolioUrl,
    };

    const employeeUpdates: Partial<StoredEmployee> = {
      firstName: firstName ?? stored.firstName,
      lastName: lastName ?? stored.lastName,
      phone: phone ?? stored.phone,
      designation: designation ?? stored.designation,
      emergencyContact: emergencyContact || primaryContactName || stored.emergencyContact,
      workMode: workMode ?? stored.workMode,
      location: location ?? stored.location,
      employmentType: employmentType ?? stored.employmentType,
      profile: updatedProf,
    };

    if (newPassword && stored.user) {
      stored.user.loginPassword = newPassword;
      employeeUpdates.loginPassword = newPassword;
    }

    EmployeeStore.update(stored.id, employeeUpdates);
    await this.refreshEmployeeCompletion(stored.id);

    return this.getEmployeeDossier(employeeId);
  }

  /**
   * Adds an uploaded document to the employee document vault
   */
  static async addDocument(employeeId: string, docData: {
    type: string;
    title: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }) {
    try {
      const doc = await db.employeeDocument.create({
        data: {
          employeeId,
          type: docData.type,
          title: docData.title,
          fileName: docData.fileName,
          fileUrl: docData.fileUrl,
          fileSize: docData.fileSize || 0,
          mimeType: docData.mimeType || "application/pdf",
          verificationStatus: "PENDING",
        },
      });

      await this.refreshEmployeeCompletion(employeeId);
      return doc;
    } catch (e: any) {
      console.warn(`[addDocument] Database failed (${e.message}), saving in EmployeeStore.`);
    }

    let stored = EmployeeStore.getById(employeeId) || EmployeeStore.findByEmailOrNumber(employeeId);
    if (!stored) {
      stored = getOfflinePersonaEmployee(employeeId);
    }
    if (!stored) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    const newDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeId: stored.id,
      type: docData.type,
      title: docData.title,
      fileName: docData.fileName,
      fileUrl: docData.fileUrl,
      fileSize: docData.fileSize || 1024,
      mimeType: docData.mimeType || "application/pdf",
      verificationStatus: "PENDING",
      verificationNotes: null,
      verifiedAt: null,
      verifiedBy: null,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docs = stored.documents || [];
    docs.unshift(newDoc);
    EmployeeStore.update(stored.id, { documents: docs });
    await this.refreshEmployeeCompletion(stored.id);

    return newDoc;
  }

  /**
   * Verifies or Rejects a document
   */
  static async verifyDocument(
    documentId: string,
    status: "VERIFIED" | "REJECTED",
    notes: string,
    verifierUserId: string,
    verifierName: string
  ) {
    try {
      const doc = await db.employeeDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: status,
          verificationNotes: notes || null,
          verifiedAt: new Date(),
          verifiedBy: verifierName,
        },
        include: { employee: true },
      });

      await AuditService.logMutation({
        actorId: verifierUserId,
        action: status === "VERIFIED" ? "EMPLOYEE_DOCUMENT_VERIFIED" : "EMPLOYEE_DOCUMENT_REJECTED",
        entity: "EmployeeDocument",
        entityId: documentId,
        newValue: { status, notes, employeeId: doc.employeeId },
        metadata: { verifier: verifierName },
      }).catch(() => {});

      await this.refreshEmployeeCompletion(doc.employeeId);
      return doc;
    } catch (e: any) {
      console.warn(`[verifyDocument] Database failed (${e.message}), verifying in EmployeeStore.`);
    }

    const allEmps = EmployeeStore.getAll();
    for (const emp of allEmps) {
      if (emp.documents && Array.isArray(emp.documents)) {
        const docIndex = emp.documents.findIndex((d: any) => d.id === documentId);
        if (docIndex !== -1) {
          emp.documents[docIndex] = {
            ...emp.documents[docIndex],
            verificationStatus: status,
            verificationNotes: notes || null,
            verifiedAt: new Date().toISOString(),
            verifiedBy: verifierName,
          };
          EmployeeStore.update(emp.id, { documents: emp.documents });
          await this.refreshEmployeeCompletion(emp.id);
          return emp.documents[docIndex];
        }
      }
    }
    throw new Error(`Document ${documentId} not found`);
  }

  /**
   * Final HR Approval Step: Transitions Employee to ACTIVE and fully activates system account
   */
  static async approveAndActivateEmployee(
    employeeId: string,
    approverUserId: string,
    approverName: string,
    approvalNotes: string = "All profile details and credentials verified by HR"
  ) {
    try {
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: {
          user: true,
          organization: true,
          profile: true,
          documents: true,
        },
      });

      if (employee) {
        const now = new Date();
        const updatedEmployee = await db.employee.update({
          where: { id: employeeId },
          data: {
            employmentStatus: "ACTIVE",
            onboardingStatus: "COMPLETED",
            approvedAt: now,
            approvedBy: approverName,
            approvalNotes,
            profileCompletion: 100,
          },
        });

        if (employee.userId) {
          await db.user.update({
            where: { id: employee.userId },
            data: { isActive: true },
          }).catch(() => {});

          await db.userCompanyMembership.updateMany({
            where: {
              userId: employee.userId,
              organizationId: employee.organizationId,
            },
            data: { status: "ACTIVE" },
          }).catch(() => {});
        }

        return updatedEmployee;
      }
    } catch (e: any) {
      console.warn(`[approveAndActivateEmployee] Database failed (${e.message}), updating in EmployeeStore.`);
    }

    const updated = EmployeeStore.update(employeeId, {
      employmentStatus: "ACTIVE",
      onboardingStatus: "COMPLETED",
      approvalNotes,
      approvedAt: new Date().toISOString(),
      approvedBy: approverName,
      profileCompletion: 100,
    });
    return updated;
  }

  /**
   * Helper to recalculate and store latest score and appropriate status
   */
  private static async refreshEmployeeCompletion(employeeId: string) {
    try {
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: {
          profile: true,
          documents: true,
          user: { include: { role: true } },
        },
      });

      if (employee) {
        const completion = this.calculateCompletion(
          employee,
          employee.profile,
          employee.documents,
          employee.user
        );

        let onboardingStatus = employee.onboardingStatus;
        if (onboardingStatus === "COMPLETED") {
          // keep completed
        } else if (completion.allDocumentsVerified && completion.canApprove) {
          onboardingStatus = "PENDING_APPROVAL";
        } else if (completion.totalScore >= 60 || employee.documents.length > 0) {
          onboardingStatus = "PENDING_VERIFICATION";
        } else {
          onboardingStatus = "PENDING_PROFILE";
        }

        await db.employee.update({
          where: { id: employeeId },
          data: {
            profileCompletion: completion.totalScore,
            onboardingStatus,
          },
        });
        return;
      }
    } catch {}

    const stored = EmployeeStore.getById(employeeId) || EmployeeStore.findByEmailOrNumber(employeeId);
    if (stored) {
      const completion = this.calculateCompletion(
        stored,
        stored.profile,
        stored.documents || [],
        stored.user
      );

      let onboardingStatus = stored.onboardingStatus || "COMPLETED";
      if (onboardingStatus !== "COMPLETED") {
        if (completion.allDocumentsVerified && completion.canApprove) {
          onboardingStatus = "PENDING_APPROVAL";
        } else if (completion.totalScore >= 60 || (stored.documents && stored.documents.length > 0)) {
          onboardingStatus = "PENDING_VERIFICATION";
        } else {
          onboardingStatus = "PENDING_PROFILE";
        }
      }

      EmployeeStore.update(stored.id, {
        profileCompletion: completion.totalScore,
        onboardingStatus,
      });
    }
  }
}
