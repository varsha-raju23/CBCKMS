const express = require("express");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { connectAzureSQL, sql } = require("../config/azureSql");
const { protectAzure } = require("../middleware/azureAuth.middleware");

const upload = multer({ storage: multer.memoryStorage() });

function mapUser(user) {
  return {
    id: user.id,
    _id: user.id,
    fullName: user.fullName,
    name: user.fullName,
    email: user.email,
    organization: user.organization,
    role: user.role,
    status: user.status,
    isProfileComplete: true,
    profile: {
      companyName: user.organization || "CBCKMS",
      companyId: "",
      department: "",
      designation: user.role || "",
      experience: "",
      specialization: "",
      bio: ""
    }
  };
}

router.get("/me", protectAzure, async (req, res) => {
  try {
    const pool = await connectAzureSQL();

    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
      .query(`
        SELECT id, fullName, email, organization, role, status
        FROM Users
        WHERE id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: mapUser(result.recordset[0])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/my-documents", protectAzure, async (req, res) => {
  try {
    const pool = await connectAzureSQL();

    const result = await pool.request()
      .input("userId", sql.Int, req.user.id)
      .query(`
        SELECT d.id, d.title, d.category, d.fileName, d.blobUrl, d.uploadedAt, p.projectName
        FROM Documents d
        LEFT JOIN Projects p ON d.projectId = p.id
        WHERE d.isActive = 1 AND d.uploadedBy = @userId
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/viewed-documents", protectAzure, async (req, res) => {
  res.json({
    success: true,
    documents: []
  });
});

router.post("/profile", protectAzure, upload.any(), async (req, res) => {
  try {
    const pool = await connectAzureSQL();

    const fullName = req.body.fullName || req.body.name || req.user.fullName;
    const organization = req.body.companyName || req.body.organization || req.user.organization || "CBCKMS";

    await pool.request()
      .input("id", sql.Int, req.user.id)
      .input("fullName", sql.NVarChar, fullName)
      .input("organization", sql.NVarChar, organization)
      .query(`
        UPDATE Users
        SET fullName = @fullName,
            organization = @organization
        WHERE id = @id
      `);

    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
      .query(`
        SELECT id, fullName, email, organization, role, status
        FROM Users
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: mapUser(result.recordset[0])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/change-password", protectAzure, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    const pool = await connectAzureSQL();

    const result = await pool.request()
      .input("id", sql.Int, req.user.id)
      .query("SELECT passwordHash FROM Users WHERE id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const ok = await bcrypt.compare(currentPassword, result.recordset[0].passwordHash);

    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.request()
      .input("id", sql.Int, req.user.id)
      .input("passwordHash", sql.NVarChar, passwordHash)
      .query(`
        UPDATE Users
        SET passwordHash = @passwordHash,
            failedLoginAttempts = 0,
            status = 'APPROVED'
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
