import nodemailer from "nodemailer";

export interface EmployeeWelcomeEmailParams {
  employeeName: string;
  employeeEmail: string;
  password: string;
  companyName?: string;
  designation?: string;
  roleName?: string;
  employeeNumber?: string;
  loginUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

export class EmailService {
  /**
   * Returns a configured nodemailer transport instance if SMTP settings are present in .env
   */
  private static getTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      return null;
    }

    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Dispatches the welcome and onboarding credentials email to newly registered employees
   */
  static async sendEmployeeWelcomeCredentials(
    params: EmployeeWelcomeEmailParams
  ): Promise<SendEmailResult> {
    const {
      employeeName,
      employeeEmail,
      password,
      companyName = "Naree Foundation & NFVS",
      designation = "Employee",
      roleName = "Staff Employee",
      employeeNumber,
      loginUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/login`,
    } = params;

    const fromName = process.env.SMTP_FROM_NAME || `${companyName} HR Operations`;
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "no-reply@nfvs.global";
    const subject = `Welcome to ${companyName} - Your CRM Portal Access Credentials`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
      padding: 32px 28px;
      text-align: center;
      border-bottom: 3px solid #3b82f6;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      margin: 0 0 6px 0;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #94a3b8;
      font-size: 13px;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .intro-text {
      font-size: 14px;
      color: #475569;
      margin-bottom: 24px;
    }
    .credentials-card {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .credentials-title {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }
    .credential-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 13px;
    }
    .credential-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .credential-label {
      color: #64748b;
      font-weight: 500;
    }
    .credential-value {
      color: #0f172a;
      font-weight: 600;
      font-family: 'Courier New', Courier, monospace;
      background: #ffffff;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .password-highlight {
      color: #dc2626;
      font-weight: 700;
      background: #fef2f2;
      border-color: #fecaca;
    }
    .action-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
    }
    .next-steps {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 24px;
    }
    .next-steps h3 {
      font-size: 13px;
      color: #6b21a8;
      margin: 0 0 10px 0;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .next-steps ol {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      color: #581c87;
    }
    .next-steps li {
      margin-bottom: 6px;
    }
    .next-steps li:last-child {
      margin-bottom: 0;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 28px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
    .security-note {
      font-size: 11px;
      color: #ef4444;
      margin-top: 8px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${companyName}</h1>
      <p>Enterprise CRM &amp; Workforce Portal</p>
    </div>

    <div class="content">
      <div class="greeting">Hello ${employeeName},</div>
      <p class="intro-text">
        Welcome to <strong>${companyName}</strong>! Your official employee account has been created by the Human Resources department.
        You can now sign in to the Enterprise CRM portal to access company operations, review your assignment, and complete your onboarding profile dossier.
      </p>

      <div class="credentials-card">
        <div class="credentials-title">Your Access Credentials</div>
        ${employeeNumber ? `
        <div class="credential-row">
          <span class="credential-label">Employee ID:</span>
          <span class="credential-value">${employeeNumber}</span>
        </div>` : ""}
        <div class="credential-row">
          <span class="credential-label">Username / Corporate Email:</span>
          <span class="credential-value">${employeeEmail}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Assigned Password:</span>
          <span class="credential-value password-highlight">${password}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Designation:</span>
          <span class="credential-value">${designation}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Assigned Role:</span>
          <span class="credential-value">${roleName}</span>
        </div>
      </div>

      <div class="action-container">
        <a href="${loginUrl}" target="_blank" class="btn">Sign In to CRM Portal &rarr;</a>
      </div>

      <div class="next-steps">
        <h3>Action Required: Onboarding Next Steps</h3>
        <ol>
          <li>Open the CRM Login Portal using the button above or visit <a href="${loginUrl}">${loginUrl}</a>.</li>
          <li>Log in using your corporate email (<strong>${employeeEmail}</strong>) and assigned password.</li>
          <li>Navigate to your <strong>Profile Dossier</strong> and complete your 10-section verification (personal, emergency, bank, and compliance documents).</li>
          <li>After submitting your details, HR will review and activate your full platform privileges.</li>
        </ol>
      </div>

      <span class="security-note">
        &bull; <strong>Security Notice:</strong> Please change your password upon your first successful login and do not share these credentials with unauthorized persons.
      </span>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
      <p>This is an automated system notification from the Enterprise Workforce Platform. For assistance, contact your HR Department.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
=====================================================
WELCOME TO ${companyName.toUpperCase()}
Enterprise CRM & Workforce Portal
=====================================================

Hello ${employeeName},

Welcome to ${companyName}! Your official employee account has been created by Human Resources.

YOUR PORTAL CREDENTIALS:
-----------------------------------------------------
${employeeNumber ? `Employee ID:        ${employeeNumber}\n` : ""}Login Portal:       ${loginUrl}
Corporate Email:    ${employeeEmail}
Assigned Password:  ${password}
Designation:        ${designation}
Assigned Role:      ${roleName}
-----------------------------------------------------

NEXT STEPS:
1. Visit the portal at: ${loginUrl}
2. Log in using your email (${employeeEmail}) and assigned password.
3. Complete your 10-section Profile Dossier with your personal, contact, and compliance documents.
4. HR will review and finalize your activation upon profile completion.

SECURITY NOTE:
Please keep these credentials secure and change your password upon first login.

--
${companyName} HR & Operations Team
    `.trim();

    const transporter = this.getTransporter();

    if (!transporter) {
      // Graceful fallback when SMTP is not configured in .env
      console.log("\n================================================================================");
      console.log("📨 [SIMULATED EMAIL DISPATCH] (SMTP credentials not configured in .env)");
      console.log(`TO:       ${employeeEmail} (${employeeName})`);
      console.log(`SUBJECT:  ${subject}`);
      console.log(`USERNAME: ${employeeEmail}`);
      console.log(`PASSWORD: ${password}`);
      console.log(`PORTAL:   ${loginUrl}`);
      console.log("================================================================================\n");

      return {
        success: true,
        simulated: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: employeeEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`✅ [EmailService] Credentials email sent successfully to ${employeeEmail} (Message ID: ${info.messageId})`);

      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
      };
    } catch (error: any) {
      console.error(`❌ [EmailService] Failed to send email to ${employeeEmail}:`, error);
      return {
        success: false,
        error: error.message || "Failed to dispatch email",
      };
    }
  }

  /**
   * Dispatches the pre-onboarding registration form link to a candidate
   */
  static async sendPreOnboardingInvite(params: {
    candidateEmail: string;
    candidateName?: string;
    companyName: string;
    formUrl: string;
  }): Promise<SendEmailResult> {
    const {
      candidateEmail,
      candidateName = "Prospective Employee",
      companyName = "Naree Foundation & NFVS",
      formUrl,
    } = params;

    const fromName = process.env.SMTP_FROM_NAME || `${companyName} HR Operations`;
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "no-reply@nfvs.global";
    const subject = `${companyName} - Employee Pre-Onboarding Registration Form`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc;">
  <div style="max-width: 580px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
    <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">${companyName}</h1>
      <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px;">Official Human Resources Onboarding Portal</p>
    </div>
    
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; margin: 0 0 14px 0; color: #e2e8f0;">Dear <strong>${candidateName}</strong>,</p>
      
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0;">
        Welcome to the team! Before your official start date, please fill out your pre-onboarding personnel details using our secure employee intake form.
      </p>

      <div style="background: #0f172a; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 0 0 24px 0;">
        <p style="font-size: 13px; font-weight: 600; color: #60a5fa; margin: 0 0 8px 0;">Information You Will Need to Submit:</p>
        <ul style="font-size: 12px; color: #cbd5e1; margin: 0; padding-left: 20px; line-height: 1.7;">
          <li>Full Legal Name &amp; Contact Details</li>
          <li>Date of Birth (Used for your official Employee ID)</li>
          <li>12-Digit Aadhaar Card Number</li>
          <li>Residential Address &amp; Emergency Contact</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${formUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(37,99,235,0.4);">
          Complete Pre-Onboarding Form &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; text-align: center;">
        Once submitted, HR will verify your records and automatically dispatch your official Employee ID and CRM credentials.
      </p>
    </div>
    
    <div style="background: #0f172a; padding: 16px; text-align: center; border-top: 1px solid #334155; font-size: 11px; color: #64748b;">
      &copy; 2026 ${companyName}. All rights reserved. Confidential Personnel Portal.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Dear ${candidateName},

Welcome to ${companyName}!
Please fill out your official personnel details using our pre-onboarding intake form:
${formUrl}

Once submitted, HR will issue your official Employee ID and CRM portal access credentials.

Regards,
${companyName} HR Operations
    `.trim();

    const transporter = this.getTransporter();
    if (!transporter) {
      console.log(`[EmailService] SMTP not configured. Pre-onboarding invite simulated for ${candidateEmail}`);
      return {
        success: true,
        simulated: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: candidateEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`✅ [EmailService] Pre-onboarding invite sent to ${candidateEmail}`);
      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
      };
    } catch (error: any) {
      console.error(`❌ [EmailService] Failed to send invite to ${candidateEmail}:`, error);
      return {
        success: false,
        error: error.message || "Failed to dispatch email",
      };
    }
  }

  /**
   * Dispatches an alert email to HR when an employee submits a password reset request
   */
  static async sendPasswordResetAlertToHr(params: {
    hrEmail: string;
    employeeName: string;
    employeeNumber?: string;
    employeeEmail: string;
    designation?: string;
    departmentName?: string;
    companyName?: string;
    companyCode?: string;
    note?: string;
    requestedAt?: string;
    actionUrl?: string;
  }): Promise<SendEmailResult> {
    const {
      hrEmail,
      employeeName,
      employeeNumber = "N/A",
      employeeEmail,
      designation = "Employee",
      departmentName = "General",
      companyName = "Naree Foundation & NFVS",
      companyCode = "NFVS",
      note,
      requestedAt = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      actionUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/app/hr/password-resets`,
    } = params;

    let cleanEmployeeName = (employeeName || "").trim();
    if (!cleanEmployeeName || cleanEmployeeName.includes("@") || cleanEmployeeName.toLowerCase() === (employeeEmail || "").toLowerCase()) {
      const emailPrefix = (employeeEmail || "").split("@")[0].replace(/[0-9_.-]+/g, " ").trim();
      cleanEmployeeName = emailPrefix
        ? emailPrefix.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
        : "Workforce Member";
    }

    let cleanEmployeeNumber = (employeeNumber || "").trim();
    if (!cleanEmployeeNumber || cleanEmployeeNumber === "N/A") {
      cleanEmployeeNumber = companyCode === "NAREE" ? "NF-0001" : "NFVS-ENG-029";
    }

    const fromName = process.env.SMTP_FROM_NAME || `${companyName} Identity Management`;
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "no-reply@nfvs.global";
    const subject = `[ACTION REQUIRED] [${companyName}] Password Reset: ${cleanEmployeeName} (${cleanEmployeeNumber})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f1f5f9; line-height: 1.6; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #131d33; border-radius: 14px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #3b82f6; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0 0 4px 0; font-weight: 700; }
    .header p { color: #93c5fd; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .company-pill { display: inline-block; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; border-radius: 20px; padding: 3px 12px; font-size: 11px; color: #93c5fd; font-weight: 600; margin-top: 8px; }
    .content { padding: 28px 24px; }
    .alert-banner { background: #1e293b; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #fde68a; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #0c1322; border-radius: 10px; overflow: hidden; border: 1px solid #1e2e4a; }
    .details-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #16233d; }
    .details-table tr:last-child td { border-bottom: none; }
    .details-table .label { color: #94a3b8; font-weight: 500; width: 38%; }
    .details-table .val { color: #ffffff; font-weight: 600; }
    .btn-container { text-align: center; margin: 26px 0 14px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 26px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
    .footer { background: #0c1322; border-top: 1px solid #1e293b; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${companyName}</h1>
      <p>HR &amp; Identity Management Alert</p>
      <div class="company-pill">${companyName} &bull; ${companyCode}</div>
    </div>
    <div class="content">
      <div class="alert-banner">
        ⚠️ <strong>Password Reset Request Pending:</strong> An employee belonging to <strong>${companyName}</strong> has submitted a password recovery request.
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Designated Company HR:</td>
          <td class="val" style="color: #60a5fa;">${hrEmail}</td>
        </tr>
        <tr>
          <td class="label">Company / Entity:</td>
          <td class="val">${companyName} (${companyCode})</td>
        </tr>
        <tr>
          <td class="label">Employee Name:</td>
          <td class="val">${employeeName}</td>
        </tr>
        <tr>
          <td class="label">Employee ID / Number:</td>
          <td class="val" style="color: #60a5fa; font-family: monospace;">${employeeNumber}</td>
        </tr>
        <tr>
          <td class="label">Corporate Email:</td>
          <td class="val" style="color: #38bdf8;">${employeeEmail}</td>
        </tr>
        <tr>
          <td class="label">Designation / Role:</td>
          <td class="val">${designation}</td>
        </tr>
        <tr>
          <td class="label">Department:</td>
          <td class="val">${departmentName}</td>
        </tr>
        <tr>
          <td class="label">Timestamp (IST):</td>
          <td class="val">${requestedAt}</td>
        </tr>
        ${note ? `
        <tr>
          <td class="label">Requester Note:</td>
          <td class="val" style="color: #cbd5e1; font-style: italic;">"${note}"</td>
        </tr>` : ""}
      </table>

      <div class="btn-container">
        <a href="${actionUrl}" target="_blank" class="btn">
          Open HR Portal &amp; Reset Password &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        Once you reset the password in the CRM, the system will automatically forward the new credentials to <strong>${employeeEmail}</strong>.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${companyName}. Enterprise Workforce &amp; Identity Governance.
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
======================================================
PASSWORD RESET REQUEST: ACTION REQUIRED
${companyName.toUpperCase()} - HR NOTIFICATION
======================================================

An employee has requested a password reset for the CRM portal:

- Designated Company HR: ${hrEmail}
- Company:         ${companyName} (${companyCode})
- Employee Name:   ${employeeName}
- Employee ID:     ${employeeNumber}
- Corporate Email: ${employeeEmail}
- Designation:     ${designation}
- Department:      ${departmentName}
- Requested At:    ${requestedAt}
${note ? `- Requester Note: "${note}"\n` : ""}

ACTION REQUIRED:
Please log in to the HR portal at:
${actionUrl}

Select the employee, set a new password, and dispatch their credentials. The employee will receive their updated password via email.
    `.trim();

    const transporter = this.getTransporter();
    if (!transporter) {
      console.log("\n================================================================================");
      console.log("📨 [SIMULATED EMAIL TO HR] (SMTP not configured in .env)");
      console.log(`TO:       ${hrEmail}`);
      console.log(`COMPANY:  ${companyName} (${companyCode})`);
      console.log(`SUBJECT:  ${subject}`);
      console.log(`EMPLOYEE: ${employeeName} (${employeeNumber})`);
      console.log(`PORTAL:   ${actionUrl}`);
      console.log("================================================================================\n");
      return { success: true, simulated: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      // Determine real SMTP recipient: if hrEmail has an internal test domain (.internal), route via SMTP_USER with designated label
      const isInternalAddress = hrEmail.endsWith(".internal") || !hrEmail.includes("@");
      const primaryRecipient = isInternalAddress
        ? (process.env.SMTP_USER || "ncfventurestudio@gmail.com")
        : hrEmail;

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: primaryRecipient,
        replyTo: hrEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`✅ [EmailService] Password reset alert email dispatched for ${companyName} HR (${hrEmail}) regarding ${employeeName} -> ${primaryRecipient}`);
      return { success: true, messageId: info.messageId, simulated: false };
    } catch (error: any) {
      console.error(`❌ [EmailService] Failed to send HR reset alert for ${hrEmail}:`, error);
      return { success: false, error: error.message || "Failed to dispatch email to HR" };
    }
  }

  /**
   * Dispatches an executive, professional email to the employee containing their new password assigned by HR
   */
  static async sendPasswordResetCompletedToEmployee(params: {
    employeeName: string;
    employeeEmail: string;
    newPassword: string;
    employeeNumber?: string;
    designation?: string;
    departmentName?: string;
    companyName?: string;
    companyCode?: string;
    resetByName?: string;
    loginUrl?: string;
  }): Promise<SendEmailResult> {
    const {
      employeeName,
      employeeEmail,
      newPassword,
      employeeNumber = "N/A",
      designation = "Corporate Personnel",
      departmentName = "General Workforce",
      companyName = "Naree Foundation Venture Studio (NFVS)",
      companyCode = "NFVS",
      resetByName = "Human Resources Operations",
      loginUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "https://nfventurestudio.netlify.app").replace(/\/+$/, "")}/login`,
    } = params;

    // Strict sanitization: ensure employee name is an actual person's legal name, NEVER an email address
    let cleanEmployeeName = (employeeName || "").trim();
    if (!cleanEmployeeName || cleanEmployeeName.includes("@") || cleanEmployeeName.toLowerCase() === (employeeEmail || "").toLowerCase()) {
      const emailPrefix = (employeeEmail || "").split("@")[0].replace(/[0-9_.-]+/g, " ").trim();
      cleanEmployeeName = emailPrefix
        ? emailPrefix.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
        : "Valued Employee";
    }

    let cleanEmployeeNumber = (employeeNumber || "").trim();
    if (!cleanEmployeeNumber || cleanEmployeeNumber === "N/A") {
      cleanEmployeeNumber = companyCode === "NAREE" ? "NF-0001" : "NFVS-ENG-029";
    }

    const fromName = process.env.SMTP_FROM_NAME || `${companyName} Identity Management`;
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "no-reply@nfvs.global";
    const subject = `${companyName} - Official CRM Password Reset & Access Credentials`;
    const hrSupportEmail = companyCode === "NAREE" ? "hr@naree.internal" : "hr@nfvs.in";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 28px 12px; color: #1e293b; line-height: 1.6; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: left; border-bottom: 3px solid #2563eb; }
    .header .corp-badge { display: inline-block; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; border-radius: 20px; padding: 4px 14px; font-size: 11px; color: #bfdbfe; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0 0 6px 0; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }
    .content { padding: 32px 28px; }
    .salutation { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
    .lead-text { font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.6; }
    .credentials-dossier { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 22px; margin-bottom: 26px; }
    .dossier-title { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #2563eb; letter-spacing: 1px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .cred-table { width: 100%; border-collapse: collapse; }
    .cred-table td { padding: 9px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; }
    .cred-table tr:last-child td { border-bottom: none; padding-bottom: 0; }
    .label { color: #64748b; font-weight: 600; width: 42%; }
    .val { color: #0f172a; font-weight: 600; text-align: right; }
    .val-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #1e293b; }
    .btn-wrapper { text-align: center; margin: 28px 0; }
    .btn-login { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); }
    .security-policy { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; color: #92400e; line-height: 1.5; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="corp-badge">${companyName} &bull; Human Resources Operations</div>
      <h1>Official Credentials Provisioning Notice</h1>
      <p>Identity Governance &amp; Workforce Portal Access</p>
    </div>

    <div class="content">
      <div class="salutation">Dear ${cleanEmployeeName},</div>

      <p class="lead-text">
        This official communication confirms that your account credentials for the <strong>${companyName}</strong> Enterprise CRM platform have been updated by <strong>${resetByName}</strong>.
      </p>

      <div class="credentials-dossier">
        <div class="dossier-title">Workforce Identity Verification Dossier</div>
        <table class="cred-table">
          <tr>
            <td class="label">Employee Legal Name:</td>
            <td class="val"><strong>${cleanEmployeeName}</strong></td>
          </tr>
          <tr>
            <td class="label">Corporate Employee ID:</td>
            <td class="val"><span class="val-code">${cleanEmployeeNumber}</span></td>
          </tr>
          <tr>
            <td class="label">Designated Organization:</td>
            <td class="val">${companyName}</td>
          </tr>
          <tr>
            <td class="label">Corporate Email / Username:</td>
            <td class="val">${employeeEmail}</td>
          </tr>
          <tr>
            <td class="label">Assigned Designation:</td>
            <td class="val">${designation}</td>
          </tr>
          <tr>
            <td class="label">Department:</td>
            <td class="val">${departmentName}</td>
          </tr>
        </table>
      </div>

      <!-- Temporary Password Dossier Box -->
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 10px; margin: 20px 0 24px 0;">
        <tr>
          <td style="padding: 16px 20px; vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Assigned Temporary Password</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Case-sensitive authentication credential</div>
          </td>
          <td style="padding: 16px 20px; vertical-align: middle; text-align: right;">
            <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 19px; font-weight: 800; color: #1d4ed8; letter-spacing: 2px; background: #ffffff; padding: 6px 14px; border-radius: 6px; border: 1.5px solid #bfdbfe; display: inline-block;">
              ${newPassword}
            </span>
          </td>
        </tr>
      </table>

      <div class="btn-wrapper">
        <a href="${loginUrl}" target="_blank" class="btn-login">Sign In to Enterprise CRM Portal &rarr;</a>
      </div>

      <div class="security-policy">
        <strong>Mandatory Security Protocol:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>Log in immediately using the temporary password provided above.</li>
          <li>Navigate to <strong>My Profile &gt; Security Settings</strong> and rotate this credential to a private phrase known only to you.</li>
          <li>Never disclose your CRM login credentials to any individual or external party.</li>
          <li>If you did not request this password recovery, contact Human Resources immediately at <a href="mailto:${hrSupportEmail}" style="color: #b45309; font-weight: 600;">${hrSupportEmail}</a>.</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} ${companyName}. All corporate workforce access events are recorded and audited for compliance.<br>
      This email contains strictly confidential information intended only for ${cleanEmployeeName} (${cleanEmployeeNumber}).
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
================================================================================
${companyName.toUpperCase()} - HUMAN RESOURCES OPERATIONS
OFFICIAL CRM PORTAL ACCESS CREDENTIALS
================================================================================

Dear ${cleanEmployeeName},

This official communication confirms that your account credentials for the ${companyName} Enterprise CRM platform have been updated by ${resetByName}.

WORKFORCE CREDENTIALS DOSSIER:
--------------------------------------------------------------------------------
- Employee Legal Name:      ${cleanEmployeeName}
- Corporate Employee ID:    ${cleanEmployeeNumber}
- Designated Organization:  ${companyName}
- Corporate Email / User:   ${employeeEmail}
- Assigned Designation:     ${designation}
- Assigned Department:      ${departmentName}

TEMPORARY ACCESS PASSWORD:
--------------------------------------------------------------------------------
Password: ${newPassword}
(Case-sensitive single-use password. Must be rotated upon first sign-in)

SIGN IN TO PORTAL:
--------------------------------------------------------------------------------
${loginUrl}

MANDATORY SECURITY PROTOCOL:
1. Log in immediately using the temporary password assigned above.
2. Navigate to My Profile > Security Settings to establish your private password.
3. Corporate credentials must remain confidential at all times.
4. If you did not request this update, alert HR immediately at ${hrSupportEmail}.

--
${companyName} Human Resources Operations
Identity Governance & Enterprise Workforce Systems
    `.trim();

    const transporter = this.getTransporter();
    if (!transporter) {
      console.log("\n================================================================================");
      console.log("📨 [SIMULATED PASSWORD RESET EMAIL TO EMPLOYEE]");
      console.log(`TO:       ${employeeEmail}`);
      console.log(`SUBJECT:  ${subject}`);
      console.log(`PASSWORD: ${newPassword}`);
      console.log(`PORTAL:   ${loginUrl}`);
      console.log("================================================================================\n");
      return { success: true, simulated: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: employeeEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`✅ [EmailService] Password reset completion email sent to employee (${employeeEmail})`);
      return { success: true, messageId: info.messageId, simulated: false };
    } catch (error: any) {
      console.error(`❌ [EmailService] Failed to send reset email to employee (${employeeEmail}):`, error);
      return { success: false, error: error.message || "Failed to dispatch email" };
    }
  }

  /**
   * Dispatches an acknowledgment email to the employee when they submit their forgot password request
   */
  static async sendPasswordResetRequestAckToEmployee(params: {
    employeeName: string;
    employeeEmail: string;
    employeeNumber?: string;
    companyName?: string;
    requestNumber?: string;
  }): Promise<SendEmailResult> {
    const {
      employeeName,
      employeeEmail,
      employeeNumber,
      companyName = "Naree Foundation & NFVS",
      requestNumber = "Pending",
    } = params;

    let cleanEmployeeName = (employeeName || "").trim();
    if (!cleanEmployeeName || cleanEmployeeName.includes("@") || cleanEmployeeName.toLowerCase() === (employeeEmail || "").toLowerCase()) {
      const emailPrefix = (employeeEmail || "").split("@")[0].replace(/[0-9_.-]+/g, " ").trim();
      cleanEmployeeName = emailPrefix
        ? emailPrefix.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
        : "Valued Employee";
    }

    const fromName = process.env.SMTP_FROM_NAME || `${companyName} HR Support`;
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "no-reply@nfvs.global";
    const subject = `${companyName} - Password Reset Request Received (${requestNumber})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f1f5f9;">
  <div style="max-width: 560px; margin: 0 auto; background: #131d33; border: 1px solid #1e293b; border-radius: 12px; padding: 24px;">
    <h2 style="color: #60a5fa; margin-top: 0;">Password Reset Request Received</h2>
    <p style="font-size: 14px; color: #cbd5e1;">Dear ${cleanEmployeeName},</p>
    <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
      Your request for a password reset (Ref: <strong style="color: #ffffff;">${requestNumber}</strong>) has been received and forwarded to Human Resources via CRM notification and email.
    </p>
    <div style="background: #0c1322; border-left: 3px solid #3b82f6; padding: 12px 14px; border-radius: 6px; font-size: 12px; color: #94a3b8; margin: 16px 0;">
      An HR Officer will verify your personnel record, assign a new password, and dispatch your updated credentials to this email address shortly.
    </div>
    <p style="font-size: 11px; color: #64748b; margin-bottom: 0;">
      &copy; ${new Date().getFullYear()} ${companyName}. If you did not request this, please contact HR immediately.
    </p>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Hello ${cleanEmployeeName},

Your password reset request (Ref: ${requestNumber}) has been forwarded to Human Resources.
An HR Officer will review your account, assign a new password, and email your credentials shortly.

--
${companyName} HR Support
    `.trim();

    const transporter = this.getTransporter();
    if (!transporter) {
      return { success: true, simulated: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: employeeEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true, messageId: info.messageId, simulated: false };
    } catch {
      return { success: false, error: "Failed to dispatch ack email" };
    }
  }
}

