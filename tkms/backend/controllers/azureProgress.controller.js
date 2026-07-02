const { connectAzureSQL, sql } = require("../config/azureSql");

async function createDailyProgressReport(req, res) {
    try {
        const {
            projectId,
            reportDate,
            chainageFrom,
            chainageTo,
            excavationLength,
            shotcreteQty,
            rockClass,
            remarks
        } = req.body;

        if (!projectId || !reportDate) {
            return res.status(400).json({
                success: false,
                message: "Project ID and report date are required"
            });
        }

        const pool = await connectAzureSQL();

        const result = await pool.request()
            .input("projectId", sql.Int, Number(projectId))
            .input("reportDate", sql.Date, reportDate)
            .input("chainageFrom", sql.NVarChar, chainageFrom || null)
            .input("chainageTo", sql.NVarChar, chainageTo || null)
            .input("excavationLength", sql.Decimal(10, 2), excavationLength || null)
            .input("shotcreteQty", sql.Decimal(10, 2), shotcreteQty || null)
            .input("rockClass", sql.NVarChar, rockClass || null)
            .input("remarks", sql.NVarChar, remarks || null)
            .input("submittedBy", sql.Int, req.user?.id || null)
            .query(`
        INSERT INTO DailyProgressReports (
          projectId,
          reportDate,
          chainageFrom,
          chainageTo,
          excavationLength,
          shotcreteQty,
          rockClass,
          remarks,
          submittedBy
        )
        OUTPUT INSERTED.*
        VALUES (
          @projectId,
          @reportDate,
          @chainageFrom,
          @chainageTo,
          @excavationLength,
          @shotcreteQty,
          @rockClass,
          @remarks,
          @submittedBy
        )
      `);

        return res.status(201).json({
            success: true,
            message: "Daily progress report created successfully",
            report: result.recordset[0]
        });
    } catch (error) {
        console.error("Create progress report error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create daily progress report"
        });
    }
}

async function getDailyProgressReports(req, res) {
    try {
        const { projectId } = req.query;

        const pool = await connectAzureSQL();

        let query = `
      SELECT *
      FROM DailyProgressReports
    `;

        if (projectId) {
            query += ` WHERE projectId = @projectId`;
        }

        query += ` ORDER BY reportDate DESC`;

        const request = pool.request();

        if (projectId) {
            request.input("projectId", sql.Int, Number(projectId));
        }

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            reports: result.recordset
        });
    } catch (error) {
        console.error("Get progress reports error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch daily progress reports"
        });
    }
}

module.exports = {
    createDailyProgressReport,
    getDailyProgressReports
};
