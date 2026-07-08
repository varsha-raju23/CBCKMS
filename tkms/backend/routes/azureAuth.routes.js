const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { azureLogin } = require("../controllers/azureLogin.controller");
const { connectAzureSQL, sql } = require("../config/azureSql");

router.post("/login", azureLogin);

router.post("/forgot-password", async (req, res) => {
    return res.json({
        success: true,
        message: "Password reset request received. Please contact admin to reset password."
    });
});

router.post("/reset-password", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and new password are required"
            });
        }

        const pool = await connectAzureSQL();
        const passwordHash = await bcrypt.hash(password, 12);

        await pool.request()
            .input("email", sql.NVarChar, email.toLowerCase().trim())
            .input("passwordHash", sql.NVarChar, passwordHash)
            .query(`
                UPDATE Users
                SET passwordHash = @passwordHash,
                    failedLoginAttempts = 0,
                    status = 'APPROVED'
                WHERE email = @email
            `);

        return res.json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
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
