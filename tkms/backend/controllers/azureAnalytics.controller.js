const { connectAzureSQL } = require("../config/azureSql");

async function getAnalyticsDashboard(req, res) {
    try {
        const pool = await connectAzureSQL();

        const projectStats = await pool.request().query(`
      SELECT 
        COUNT(*) AS totalProjects,
        AVG(CAST(progressPercent AS FLOAT)) AS averageProgress
      FROM Projects
    `);

        const projectProgress = await pool.request().query(`
      SELECT 
        projectName,
        progressPercent,
        status
      FROM Projects
      ORDER BY createdAt DESC
    `);

        const documentStats = await pool.request().query(`
      SELECT 
        category,
        COUNT(*) AS totalDocuments
      FROM Documents
      GROUP BY category
      ORDER BY totalDocuments DESC
    `);

        const riskStats = await pool.request().query(`
      SELECT 
        riskLevel,
        COUNT(*) AS totalRisks
      FROM TunnelMonitoring
      WHERE riskLevel IS NOT NULL
      GROUP BY riskLevel
    `);

        const monitoringStats = await pool.request().query(`
      SELECT 
        monitoringType,
        COUNT(*) AS totalRecords
      FROM TunnelMonitoring
      GROUP BY monitoringType
      ORDER BY totalRecords DESC
    `);

        const dailyProgressStats = await pool.request().query(`
      SELECT TOP 10
        reportDate,
        SUM(ISNULL(excavationLength, 0)) AS totalExcavation,
        SUM(ISNULL(shotcreteQty, 0)) AS totalShotcrete
      FROM DailyProgressReports
      GROUP BY reportDate
      ORDER BY reportDate DESC
    `);

        return res.status(200).json({
            success: true,
            analytics: {
                projectStats: projectStats.recordset[0],
                projectProgress: projectProgress.recordset,
                documentStats: documentStats.recordset,
                riskStats: riskStats.recordset,
                monitoringStats: monitoringStats.recordset,
                dailyProgressStats: dailyProgressStats.recordset
            }
        });
    } catch (error) {
        console.error("Analytics dashboard error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch analytics dashboard"
        });
    }
}

module.exports = {
    getAnalyticsDashboard
};
