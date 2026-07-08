const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connectAzureSQL, sql } = require("../config/azureSql");
const { sendApprovalRequestEmail } = require("../services/azureEmail.service");

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

    return roleMap[String(role).toLowerCase().trim()] || String(role).toUpperCase();
}

async function requestAccount(req, res) {
    try {
        const { fullName, email, password, role } = req.body;
        const organization = req.body.organization || "CBCKMS";

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, password and role are required"
            });
        }

        const cleanEmail = email.toLowerCase().trim();
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
            .input("email", sql.NVarChar, cleanEmail)
            .query("SELECT id, status FROM Users WHERE email = @email");

        if (existingUser.recordset.length > 0) {
            const status = existingUser.recordset[0].status;

            if (status === "PENDING") {
                return res.status(200).json({
                    success: true,
                    message: "Account request already submitted and waiting for admin approval."
                });
            }

            return res.status(409).json({
                success: false,
                message: "Account already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.request()
            .input("fullName", sql.NVarChar, fullName)
            .input("email", sql.NVarChar, cleanEmail)
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
            process.env.JWT_SECRET || "fallback_secret",
            { expiresIn: "24h" }
        );

        try {
            await sendApprovalRequestEmail({
                fullName,
                email: cleanEmail,
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
            message: error.message || "Failed to submit account request"
        });
    }
}

module.exports = {
    requestAccount
};
