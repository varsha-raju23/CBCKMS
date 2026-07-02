const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connectAzureSQL, sql } = require("../config/azureSql");
const { sendApprovalRequestEmail } = require("../services/azureEmail.service");

function isAllowedCompanyEmail(email) {
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
        .split(",")
        .map(domain => domain.trim().toLowerCase());

    const emailDomain = email.split("@")[1]?.toLowerCase();

    return allowedDomains.includes(emailDomain);
}

function normalizeRole(role) {
    const roleMap = {
        "super admin": "SUPER_ADMIN",
        "admin": "ADMIN",
        "project manager": "PROJECT_MANAGER",
        "manager": "PROJECT_MANAGER",
        "tunnel engineer": "TUNNEL_ENGINEER",
        "engineer": "TUNNEL_ENGINEER",
        "viewer": "VIEWER"
    };

    return roleMap[String(role).toLowerCase()] || role;
}

async function requestAccount(req, res) {
    try {
        const { fullName, email, password, organization, role } = req.body;

        if (!fullName || !email || !password || !organization || !role) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, password, organization and role are required"
            });
        }

        if (!isAllowedCompanyEmail(email)) {
            return res.status(403).json({
                success: false,
                message: "Only approved company email addresses are allowed"
            });
        }

        const finalRole = normalizeRole(role);

        const allowedRoles = [
            "SUPER_ADMIN",
            "ADMIN",
            "PROJECT_MANAGER",
            "TUNNEL_ENGINEER",
            "VIEWER"
        ];

        if (!allowedRoles.includes(finalRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role selected"
            });
        }

        const pool = await connectAzureSQL();

        const existingUser = await pool.request()
            .input("email", sql.NVarChar, email)
            .query("SELECT id FROM Users WHERE email = @email");

        if (existingUser.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Account already exists or request already submitted"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.request()
            .input("fullName", sql.NVarChar, fullName)
            .input("email", sql.NVarChar, email)
            .input("passwordHash", sql.NVarChar, passwordHash)
            .input("organization", sql.NVarChar, organization)
            .input("role", sql.NVarChar, finalRole)
            .query(`
                INSERT INTO Users (
                    fullName,
                    email,
                    passwordHash,
                    organization,
                    role,
                    status
                )
                OUTPUT INSERTED.id
                VALUES (
                    @fullName,
                    @email,
                    @passwordHash,
                    @organization,
                    @role,
                    'PENDING'
                )
            `);

        const userId = result.recordset[0].id;

        const approvalToken = jwt.sign(
            {
                userId,
                purpose: "ACCOUNT_APPROVAL"
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        try {
            await sendApprovalRequestEmail({
                fullName,
                email,
                organization,
                role: finalRole,
                approvalToken
            });
        } catch (emailError) {
            console.warn("Approval email skipped:", emailError.message);
        }

        return res.status(201).json({
            success: true,
            message: "Account request submitted. You can log in only after admin approval."
        });
    } catch (error) {
        console.error("Account request error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to submit account request"
        });
    }
}

module.exports = {
    requestAccount
};