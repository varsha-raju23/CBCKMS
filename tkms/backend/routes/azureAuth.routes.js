const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { azureLogin } = require("../controllers/azureLogin.controller");
const { connectAzureSQL, sql } = require("../config/azureSql");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

router.post("/login", azureLogin);

function getBaseUrl(req) {
    return (process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function createEmailTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
        throw new Error("Email environment variables are missing");
    }

    const port = Number(process.env.EMAIL_PORT || 587);

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

router.post("/forgot-password", async (req, res) => {
    try {
        const email = String(req.body.email || "").toLowerCase().trim();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const pool = await connectAzureSQL();

        const userResult = await pool.request()
            .input("email", sql.NVarChar, email)
            .query(`
                SELECT TOP 1 id, email, fullName, status
                FROM Users
                WHERE LOWER(email) = @email
            `);

        if (userResult.recordset.length === 0) {
            return res.json({
                success: true,
                message: "If this email exists, a password reset link has been sent."
            });
        }

        const user = userResult.recordset[0];

        const token = jwt.sign(
            {
                email: user.email,
                purpose: "password-reset"
            },
            JWT_SECRET,
            { expiresIn: "30m" }
        );

        const resetLink = `${getBaseUrl(req)}/pages/reset-password.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

        const transporter = createEmailTransporter();

        await transporter.sendMail({
            from: `"CBCKMS" <${process.env.EMAIL_FROM}>`,
            to: user.email,
            subject: "CBCKMS Password Reset",
            text: `Hello ${user.fullName || "User"},

You requested a password reset for your CBCKMS account.

Click this link to reset your password:
${resetLink}

This link will expire in 30 minutes.

If you did not request this, ignore this email.

CBCKMS Team`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>CBCKMS Password Reset</h2>
                    <p>Hello ${user.fullName || "User"},</p>
                    <p>You requested a password reset for your CBCKMS account.</p>
                    <p>
                        <a href="${resetLink}" style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">
                            Reset Password
                        </a>
                    </p>
                    <p>This link will expire in 30 minutes.</p>
                    <p>If you did not request this, ignore this email.</p>
                    <p>CBCKMS Team</p>
                </div>
            `
        });

        return res.json({
            success: true,
            message: "Password reset email sent. Please check inbox/spam."
        });

    } catch (error) {
        console.error("Forgot password email error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send password reset email",
            error: error.message
        });
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const { token, email, password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "New password is required"
            });
        }

        let resetEmail = email ? String(email).toLowerCase().trim() : "";

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);

            if (decoded.purpose !== "password-reset") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid reset token"
                });
            }

            resetEmail = String(decoded.email).toLowerCase().trim();
        }

        if (!resetEmail) {
            return res.status(400).json({
                success: false,
                message: "Email or reset token is required"
            });
        }

        const pool = await connectAzureSQL();
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.request()
            .input("email", sql.NVarChar, resetEmail)
            .input("passwordHash", sql.NVarChar, passwordHash)
            .query(`
                UPDATE Users
                SET passwordHash = @passwordHash,
                    failedLoginAttempts = 0,
                    status = 'APPROVED'
                WHERE LOWER(email) = @email
            `);

        if (!result.rowsAffected || result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            message: "Password reset successfully. Please login with new password."
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Invalid or expired reset link",
            error: error.message
        });
    }
});

router.get("/verify-email", (req, res) => {
    return res.json({
        success: true,
        message: "Email verification not required. Admin approval is used."
    });
});

module.exports = router;
