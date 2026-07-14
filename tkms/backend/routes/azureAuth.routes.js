const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");
const { azureLogin } = require("../controllers/azureLogin.controller");
const { connectAzureSQL, sql } = require("../config/azureSql");
const { sendPasswordResetEmail } = require("../utils/email");

// ──────────────────────────────────────────────────────────────────
// POST /api/azure-auth/login
// ──────────────────────────────────────────────────────────────────
router.post("/login", azureLogin);

// ──────────────────────────────────────────────────────────────────
// POST /api/azure-auth/forgot-password
//  - Looks up user in Azure SQL
//  - Generates a secure token + expiry
//  - Stores token in DB
//  - Sends reset email via nodemailer
// ──────────────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const pool = await connectAzureSQL();

        // Look up user
        const userResult = await pool.request()
            .input("email", sql.NVarChar, email.toLowerCase().trim())
            .query(`SELECT id, email, fullName FROM Users WHERE email = @email`);

        // Always respond with success to prevent email enumeration
        if (!userResult.recordset || userResult.recordset.length === 0) {
            return res.json({
                success: true,
                message: "If that email is registered, a reset link has been sent."
            });
        }

        const user = userResult.recordset[0];

        // Generate a secure random token (64 hex chars)
        const resetToken  = crypto.randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Store token + expiry in DB
        await pool.request()
            .input("email",       sql.NVarChar,  email.toLowerCase().trim())
            .input("resetToken",  sql.NVarChar,  resetToken)
            .input("tokenExpiry", sql.DateTime2, tokenExpiry)
            .query(`
                UPDATE Users
                SET resetPasswordToken   = @resetToken,
                    resetPasswordExpires = @tokenExpiry
                WHERE email = @email
            `);

        // Send the reset email
        try {
            await sendPasswordResetEmail(
                user.email,
                user.fullName || user.email.split("@")[0],
                resetToken
            );
        } catch (emailErr) {
            console.error("Password reset email failed:", emailErr.message);
            // Don't expose email errors to client
        }

        return res.json({
            success: true,
            message: "If that email is registered, a reset link has been sent."
        });

    } catch (error) {
        console.error("Forgot-password error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});

// ──────────────────────────────────────────────────────────────────
// POST /api/azure-auth/reset-password
//  - Validates the reset token
//  - Updates password in Azure SQL
// ──────────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password, email } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Token and new password are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });
        }

        const pool = await connectAzureSQL();

        // Find user by token and check expiry
        const query = email
            ? `SELECT id, email FROM Users WHERE email = @email AND resetPasswordToken = @token AND resetPasswordExpires > GETUTCDATE()`
            : `SELECT id, email FROM Users WHERE resetPasswordToken = @token AND resetPasswordExpires > GETUTCDATE()`;

        const request = pool.request().input("token", sql.NVarChar, token);
        if (email) request.input("email", sql.NVarChar, email.toLowerCase().trim());

        const result = await request.query(query);

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired. Please request a new one."
            });
        }

        const user         = result.recordset[0];
        const passwordHash = await bcrypt.hash(password, 12);

        // Update password and clear the reset token
        await pool.request()
            .input("email",        sql.NVarChar, user.email)
            .input("passwordHash", sql.NVarChar, passwordHash)
            .query(`
                UPDATE Users
                SET passwordHash          = @passwordHash,
                    resetPasswordToken    = NULL,
                    resetPasswordExpires  = NULL,
                    failedLoginAttempts   = 0,
                    status                = 'APPROVED'
                WHERE email = @email
            `);

        return res.json({
            success: true,
            message: "Password reset successfully. You can now sign in with your new password."
        });

    } catch (error) {
        console.error("Reset-password error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});

// ──────────────────────────────────────────────────────────────────
// GET /api/azure-auth/verify-email
// ──────────────────────────────────────────────────────────────────
router.get("/verify-email", (req, res) => {
    return res.json({
        success: true,
        message: "Email verification is not required. Admin approval is used."
    });
});

module.exports = router;
