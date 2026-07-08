const express = require("express");
const router = express.Router();
const { connectAzureSQL, sql } = require("../config/azureSql");
const { protectAzure, allowAzureRoles } = require("../middleware/azureAuth.middleware");

function normalizeRole(role) {
    const map = {
        admin: "ADMIN",
        manager: "PROJECT_MANAGER",
        engineer: "TUNNEL_ENGINEER",
        viewer: "VIEWER",
        SUPER_ADMIN: "SUPER_ADMIN",
        ADMIN: "ADMIN",
        PROJECT_MANAGER: "PROJECT_MANAGER",
        TUNNEL_ENGINEER: "TUNNEL_ENGINEER",
        VIEWER: "VIEWER"
    };
    return map[role] || role;
}

router.get("/stats", protectAzure, allowAzureRoles("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        const users = await pool.request().query(`
            SELECT
              COUNT(*) AS totalUsers,
              SUM(CASE WHEN role IN ('SUPER_ADMIN','ADMIN') THEN 1 ELSE 0 END) AS totalAdmins,
              SUM(CASE WHEN role = 'TUNNEL_ENGINEER' THEN 1 ELSE 0 END) AS totalEngineers,
              SUM(CASE WHEN role = 'PROJECT_MANAGER' THEN 1 ELSE 0 END) AS totalManagers,
              SUM(CASE WHEN role = 'VIEWER' THEN 1 ELSE 0 END) AS totalViewers
            FROM Users
        `);

        const docs = await pool.request().query(`
            SELECT COUNT(*) AS totalDocuments
            FROM Documents
            WHERE isActive = 1
        `);

        res.json({
            success: true,
            stats: {
                totalUsers: users.recordset[0].totalUsers || 0,
                totalAdmins: users.recordset[0].totalAdmins || 0,
                totalEngineers: users.recordset[0].totalEngineers || 0,
                totalManagers: users.recordset[0].totalManagers || 0,
                totalViewers: users.recordset[0].totalViewers || 0,
                totalDocuments: docs.recordset[0].totalDocuments || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get("/users", protectAzure, allowAzureRoles("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request().query(`
            SELECT id, fullName, email, organization, role, status, createdAt, approvedAt
            FROM Users
            ORDER BY createdAt DESC
        `);

        res.json({
            success: true,
            users: result.recordset.map(u => ({
                ...u,
                _id: u.id,
                name: u.fullName,
                isActive: u.status === "APPROVED"
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put("/users/:id/role", protectAzure, allowAzureRoles("SUPER_ADMIN"), async (req, res) => {
    try {
        const role = normalizeRole(req.body.role);

        const pool = await connectAzureSQL();

        await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .input("role", sql.NVarChar, role)
            .query("UPDATE Users SET role = @role WHERE id = @id");

        res.json({ success: true, message: "Role updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put("/users/:id/toggle-active", protectAzure, allowAzureRoles("SUPER_ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        const user = await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .query("SELECT status FROM Users WHERE id = @id");

        if (!user.recordset.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const newStatus = user.recordset[0].status === "APPROVED" ? "LOCKED" : "APPROVED";

        await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .input("status", sql.NVarChar, newStatus)
            .query(`
                UPDATE Users
                SET status = @status,
                    approvedAt = CASE WHEN @status = 'APPROVED' THEN SYSUTCDATETIME() ELSE approvedAt END
                WHERE id = @id
            `);

        res.json({ success: true, message: "User status updated", status: newStatus });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get("/documents", protectAzure, allowAzureRoles("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request().query(`
            SELECT d.id, d.title, d.category, d.fileName, d.blobUrl, d.uploadedAt, d.isActive, p.projectName
            FROM Documents d
            LEFT JOIN Projects p ON d.projectId = p.id
            WHERE d.isActive = 1
            ORDER BY d.uploadedAt DESC
        `);

        res.json({
            success: true,
            documents: result.recordset.map(d => ({
                ...d,
                _id: d.id,
                originalName: d.title || d.fileName,
                documentType: d.category,
                departmentName: d.category,
                createdAt: d.uploadedAt
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete("/documents/:id", protectAzure, allowAzureRoles("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .query("UPDATE Documents SET isActive = 0 WHERE id = @id");

        res.json({ success: true, message: "Document deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.patch("/users/:id/approve", protectAzure, allowAzureRoles("SUPER_ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .query("UPDATE Users SET status = 'APPROVED', approvedAt = SYSUTCDATETIME() WHERE id = @id");

        res.json({ success: true, message: "User approved" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.patch("/users/:id/reject", protectAzure, allowAzureRoles("SUPER_ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        await pool.request()
            .input("id", sql.Int, Number(req.params.id))
            .query("UPDATE Users SET status = 'REJECTED' WHERE id = @id");

        res.json({ success: true, message: "User rejected" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get("/pending-users", protectAzure, allowAzureRoles("SUPER_ADMIN", "ADMIN"), async (req, res) => {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request().query(`
            SELECT id, fullName, email, organization, role, status, createdAt
            FROM Users
            WHERE status = 'PENDING'
            ORDER BY createdAt DESC
        `);

        res.json({
            success: true,
            users: result.recordset.map(u => ({ ...u, _id: u.id }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
