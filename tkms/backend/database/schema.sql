CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    fullName NVARCHAR(150) NOT NULL,
    email NVARCHAR(150) UNIQUE NOT NULL,
    passwordHash NVARCHAR(255) NOT NULL,
    organization NVARCHAR(150) NOT NULL,
    role NVARCHAR(50) NOT NULL CHECK (
        role IN (
            'SUPER_ADMIN',
            'ADMIN',
            'PROJECT_MANAGER',
            'TUNNEL_ENGINEER',
            'VIEWER'
        )
    ),
    status NVARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'LOCKED')
    ),
    failedLoginAttempts INT DEFAULT 0,
    lastLoginAt DATETIME2 NULL,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    approvedAt DATETIME2 NULL
);

CREATE TABLE Projects (
    id INT IDENTITY(1,1) PRIMARY KEY,
    projectName NVARCHAR(200) NOT NULL,
    location NVARCHAR(200),
    tunnelType NVARCHAR(100),
    method NVARCHAR(100),
    startDate DATE,
    endDate DATE,
    progressPercent INT DEFAULT 0,
    status NVARCHAR(50) DEFAULT 'ACTIVE',
    createdBy INT,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (createdBy) REFERENCES Users(id)
);

CREATE TABLE Documents (
    id INT IDENTITY(1,1) PRIMARY KEY,
    projectId INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    fileName NVARCHAR(255) NOT NULL,
    blobUrl NVARCHAR(MAX) NOT NULL,
    versionNo INT DEFAULT 1,
    uploadedBy INT,
    uploadedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    isActive BIT DEFAULT 1,
    FOREIGN KEY (projectId) REFERENCES Projects(id),
    FOREIGN KEY (uploadedBy) REFERENCES Users(id)
);

CREATE TABLE DailyProgressReports (
    id INT IDENTITY(1,1) PRIMARY KEY,
    projectId INT NOT NULL,
    reportDate DATE NOT NULL,
    chainageFrom NVARCHAR(50),
    chainageTo NVARCHAR(50),
    excavationLength DECIMAL(10,2),
    shotcreteQty DECIMAL(10,2),
    rockClass NVARCHAR(50),
    remarks NVARCHAR(MAX),
    submittedBy INT,
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (projectId) REFERENCES Projects(id),
    FOREIGN KEY (submittedBy) REFERENCES Users(id)
);

CREATE TABLE TunnelMonitoring (
    id INT IDENTITY(1,1) PRIMARY KEY,
    projectId INT NOT NULL,
    monitoringType NVARCHAR(100) NOT NULL,
    chainage NVARCHAR(50),
    readingValue DECIMAL(18,4),
    unit NVARCHAR(50),
    riskLevel NVARCHAR(50),
    remarks NVARCHAR(MAX),
    recordedBy INT,
    recordedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (projectId) REFERENCES Projects(id),
    FOREIGN KEY (recordedBy) REFERENCES Users(id)
);

CREATE TABLE AuditLogs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NULL,
    action NVARCHAR(200) NOT NULL,
    ipAddress NVARCHAR(100),
    userAgent NVARCHAR(MAX),
    details NVARCHAR(MAX),
    createdAt DATETIME2 DEFAULT SYSUTCDATETIME()
);