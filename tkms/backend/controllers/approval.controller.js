const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connectAzureSQL, sql } = require("../config/azureSql");
const { sendApprovalRequestEmail } = require("../services/azureEmail.service");

function isAllowedCompanyEmail(email) {
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
        .split(",")
        .map(domain => domain.trim().toLowerCase())
        .filter(Boolean);

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

        await sendApprovalRequestEmail({
            fullName,
            email,
            organization,
            role: finalRole,
            approvalToken
        });

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

async function approveUser(req, res) {
    try {
        const { token } = req.params;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.purpose !== "ACCOUNT_APPROVAL") {
            return res.status(400).json({
                success: false,
                message: "Invalid approval token"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("userId", sql.Int, decoded.userId)
            .query(`
                UPDATE Users
                SET status = 'APPROVED'
                WHERE id = @userId AND status = 'PENDING'
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send(`
                <h2>Approval Failed</h2>
                <p>User not found or already approved/rejected.</p>
            `);
        }

        return res.status(200).send(`
            <h2>User Account Approved Successfully</h2>
            <p>The user can now login to Tunnel KMS.</p>
        `);

    } catch (error) {
        console.error("Approve user error:", error.message);

        return res.status(400).send(`
            <h2>Invalid or Expired Link</h2>
            <p>The approval link is invalid or expired.</p>
        `);
    }
}

async function rejectUser(req, res) {
    try {
        const { token } = req.params;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.purpose !== "ACCOUNT_APPROVAL") {
            return res.status(400).json({
                success: false,
                message: "Invalid rejection token"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("userId", sql.Int, decoded.userId)
            .query(`
                UPDATE Users
                SET status = 'REJECTED'
                WHERE id = @userId AND status = 'PENDING'
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).send(`
                <h2>Rejection Failed</h2>
                <p>User not found or already approved/rejected.</p>
            `);
        }

        return res.status(200).send(`
            <h2>User Account Rejected</h2>
            <p>The user cannot login to Tunnel KMS.</p>
        `);

    } catch (error) {
        console.error("Reject user error:", error.message);

        return res.status(400).send(`
            <h2>Invalid or Expired Link</h2>
            <p>The rejection link is invalid or expired.</p>
        `);
    }
}

module.exports = {
    requestAccount,
    approveUser,
    rejectUser
};