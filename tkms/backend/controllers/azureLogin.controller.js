const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connectAzureSQL, sql } = require("../config/azureSql");

async function azureLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("email", sql.NVarChar, email.toLowerCase().trim())
            .query("SELECT * FROM Users WHERE email = @email");

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.recordset[0];

        if (user.status === "PENDING") {
            return res.status(403).json({
                success: false,
                message: "Your account is waiting for admin approval"
            });
        }

        if (user.status === "REJECTED") {
            return res.status(403).json({
                success: false,
                message: "Your account request was rejected"
            });
        }

        if (user.status === "LOCKED" || user.failedLoginAttempts >= 5) {
            return res.status(423).json({
                success: false,
                message: "Account locked due to multiple failed login attempts"
            });
        }

        if (user.status !== "APPROVED") {
            return res.status(403).json({
                success: false,
                message: "Account is not active"
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordMatch) {
            const failedAttempts = (user.failedLoginAttempts || 0) + 1;

            await pool.request()
                .input("email", sql.NVarChar, email.toLowerCase().trim())
                .query(`
                    UPDATE Users
                    SET failedLoginAttempts = failedLoginAttempts + 1
                    WHERE email = @email
                `);

            if (failedAttempts >= 5) {
                await pool.request()
                    .input("email", sql.NVarChar, email.toLowerCase().trim())
                    .query(`
                        UPDATE Users
                        SET status = 'LOCKED'
                        WHERE email = @email
                    `);
            }

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        await pool.request()
            .input("email", sql.NVarChar, email.toLowerCase().trim())
            .query(`
                UPDATE Users
                SET failedLoginAttempts = 0,
                    lastLoginAt = SYSUTCDATETIME()
                WHERE email = @email
            `);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET || "fallback_secret",
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "8h"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                organization: user.organization,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error("Azure login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
}

module.exports = {
    azureLogin
};
