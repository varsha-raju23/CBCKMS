const { connectAzureSQL, sql } = require("../config/azureSql");

async function createProject(req, res) {
    try {
        const {
            projectName,
            location,
            tunnelType,
            method,
            startDate,
            endDate
        } = req.body;

        if (!projectName) {
            return res.status(400).json({
                success: false,
                message: "Project name is required"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("projectName", sql.NVarChar, projectName)
            .input("location", sql.NVarChar, location || null)
            .input("tunnelType", sql.NVarChar, tunnelType || null)
            .input("method", sql.NVarChar, method || null)
            .input("startDate", sql.Date, startDate || null)
            .input("endDate", sql.Date, endDate || null)
            .input("createdBy", sql.Int, req.user?.id || null)
            .query(`
        INSERT INTO Projects (
          projectName,
          location,
          tunnelType,
          method,
          startDate,
          endDate,
          createdBy
        )
        OUTPUT INSERTED.*
        VALUES (
          @projectName,
          @location,
          @tunnelType,
          @method,
          @startDate,
          @endDate,
          @createdBy
        )
      `);

        return res.status(201).json({
            success: true,
            message: "Tunnel project created successfully",
            project: result.recordset[0]
        });
    } catch (error) {
        console.error("Create project error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create project"
        });
    }
}

async function getProjects(req, res) {
    try {
        const pool = await connectAzureSQL();

        const result = await pool.request().query(`
      SELECT *
      FROM Projects
      ORDER BY createdAt DESC
    `);

        return res.status(200).json({
            success: true,
            projects: result.recordset
        });
    } catch (error) {
        console.error("Get projects error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch projects"
        });
    }
}

async function getProjectById(req, res) {
    try {
        const { id } = req.params;

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(id))
            .query(`
        SELECT *
        FROM Projects
        WHERE id = @id
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        return res.status(200).json({
            success: true,
            project: result.recordset[0]
        });
    } catch (error) {
        console.error("Get project error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch project"
        });
    }
}

async function updateProjectProgress(req, res) {
    try {
        const { id } = req.params;
        const { progressPercent, status } = req.body;

        if (progressPercent === undefined) {
            return res.status(400).json({
                success: false,
                message: "Progress percentage is required"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("id", sql.Int, Number(id))
            .input("progressPercent", sql.Int, Number(progressPercent))
            .input("status", sql.NVarChar, status || "ACTIVE")
            .query(`
        UPDATE Projects
        SET progressPercent = @progressPercent,
            status = @status
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project progress updated successfully",
            project: result.recordset[0]
        });
    } catch (error) {
        console.error("Update project progress error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to update project progress"
        });
    }
}

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProjectProgress
};
