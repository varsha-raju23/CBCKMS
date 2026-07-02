const { connectAzureSQL, sql } = require("../config/azureSql");
const {
    sendAccountApprovedEmail,
    sendAccountRejectedEmail
} = require("../services/azureEmail.service");

async function getPendingUsers(req, res) {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request().query(`
      SELECT id, fullName, email, organization, role, status, createdAt
      FROM Users
      WHERE status = 'PENDING'
      ORDER BY createdAt DESC
    `);

        return res.status(200).json({
            success: true,
            users: result.recordset
        });
    } catch (error) {
        console.error("Get pending users error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending users"
        });
    }
}

async function getAllUsers(req, res) {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request().query(`
      SELECT id, fullName, email, organization, role, status, failedLoginAttempts, lastLoginAt, createdAt, approvedAt
      FROM Users
      ORDER BY createdAt DESC
    `);

        return res.status(200).json({
            success: true,
            users: result.recordset
        });
    } catch (error) {
        console.error("Get all users error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
}

async function approveUserById(req, res) {
    try {
        const { id } = req.params;

        const pool = await connectAzureSQL();

        const userResult = await pool.request()
            .input("id", sql.Int, Number(id))
            .query(`
        SELECT id, email, status
        FROM Users
        WHERE id = @id
      `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userResult.recordset[0];

        await pool.request()
            .input("id", sql.Int, Number(id))
            .query(`
        UPDATE Users
        SET status = 'APPROVED',
            approvedAt = SYSUTCDATETIME(),
            failedLoginAttempts = 0
        WHERE id = @id
      `);

        try {
            await sendAccountRejectedEmail(user.email);
        } catch (emailError) {
            console.warn("Rejection email skipped:", emailError.message);
        }

        return res.status(200).json({
            success: true,
            message: "User approved successfully"
        });
    } catch (error) {
        console.error("Approve user by id error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to approve user"
        });
    }
}

async function rejectUserById(req, res) {
    try {
        const { id } = req.params;

        const pool = await connectAzureSQL();

        const userResult = await pool.request()
            .input("id", sql.Int, Number(id))
            .query(`
        SELECT id, email
        FROM Users
        WHERE id = @id
      `);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userResult.recordset[0];

        await pool.request()
            .input("id", sql.Int, Number(id))
            .query(`
        UPDATE Users
        SET status = 'REJECTED'
        WHERE id = @id
      `);

        try {
            await sendAccountApprovedEmail(user.email);
        } catch (emailError) {
            console.warn("Approval email skipped:", emailError.message);
        }

        return res.status(200).json({
            success: true,
            message: "User rejected successfully"
        });
    } catch (error) {
        console.error("Reject user by id error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to reject user"
        });
    }
}

async function unlockUser(req, res) {
    try {
        const { id } = req.params;

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(id))
            .query(`
        UPDATE Users
        SET status = 'APPROVED',
            failedLoginAttempts = 0
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.status
        WHERE id = @id
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User account unlocked successfully",
            user: result.recordset[0]
        });
    } catch (error) {
        console.error("Unlock user error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to unlock user"
        });
    }
}

async function updateUserRole(req, res) {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const allowedRoles = [
            "SUPER_ADMIN",
            "ADMIN",
            "PROJECT_MANAGER",
            "TUNNEL_ENGINEER",
            "VIEWER"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(id))
            .input("role", sql.NVarChar, role)
            .query(`
        UPDATE Users
        SET role = @role
        OUTPUT INSERTED.id, INSERTED.fullName, INSERTED.email, INSERTED.role
        WHERE id = @id
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User role updated successfully",
            user: result.recordset[0]
        });
    } catch (error) {
        console.error("Update user role error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to update user role"
        });
    }
}

async function getAuditLogs(req, res) {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request().query(`
      SELECT TOP 200
        a.id,
        a.userId,
        u.email,
        u.fullName,
        a.action,
        a.ipAddress,
        a.userAgent,
        a.details,
        a.createdAt
      FROM AuditLogs a
      LEFT JOIN Users u ON a.userId = u.id
      ORDER BY a.createdAt DESC
    `);

        return res.status(200).json({
            success: true,
            auditLogs: result.recordset
        });
    } catch (error) {
        console.error("Get audit logs error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch audit logs"
        });
    }
}

module.exports = {
    getPendingUsers,
    getAllUsers,
    approveUserById,
    rejectUserById,
    unlockUser,
    updateUserRole,
    getAuditLogs
};