# 🚇 TunnelKMS — Complete Setup Guide

## Cloud-Based Construction Knowledge Management System for Tunnel Projects

\---

## 📁 FOLDER STRUCTURE

```
tunnel-kms/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Document.js
│   │   └── AIChat.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── documents.js
│   │   ├── ai.js
│   │   ├── admin.js
│   │   └── notifications.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── utils/
│   │   ├── email.js
│   │   └── textExtractor.js
│   ├── uploads/              ← auto-created on first run
│   ├── server.js
│   ├── package.json
│   └── .env                  ← you create this
│
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── app.js
    │   └── nav.js
    ├── pages/
    │   ├── login.html
    │   ├── signup.html
    │   ├── forgot-password.html
    │   ├── reset-password.html
    │   ├── verify-email.html
    │   ├── profile-setup.html
    │   ├── dashboard.html
    │   ├── documents.html
    │   ├── ai-assistant.html
    │   ├── help-center.html
    │   ├── profile.html
    │   └── admin.html
    └── index.html
```

\---

## ✅ STEP-BY-STEP SETUP INSTRUCTIONS

### STEP 1 — Install Prerequisites

Make sure these are installed on your computer:

|Tool|Download|
|-|-|
|Node.js (v18+)|https://nodejs.org|
|MongoDB Community OR Atlas|https://www.mongodb.com|
|VS Code (recommended)|https://code.visualstudio.com|
|Git (optional)|https://git-scm.com|

Verify Node.js:

```bash
node --version   # Should show v18+
npm --version    # Should show 9+
```

\---

### STEP 2 — Create MongoDB Database

**Option A: MongoDB Atlas (Recommended - Cloud, Free)**

1. Go to https://cloud.mongodb.com
2. Create a free account
3. Create a new cluster (free tier M0)
4. Click "Connect" → "Drivers" → Copy the connection string
5. Replace `<password>` with your DB user password
6. The URI looks like:
`mongodb+srv://myuser:mypass@cluster0.abc123.mongodb.net/tunnel\_kms`

**Option B: Local MongoDB**

```bash
# Install MongoDB Community Edition
# Then start it:
mongod --dbpath /data/db

# URI will be:
mongodb://localhost:27017/tunnel\_kms
```

\---

### STEP 3 — Get Google Gemini API Key (FREE)

1. Go to → https://aistudio.google.com
2. Click "Get API Key" → "Create API Key"
3. Copy the key (starts with `AIza...`)
4. Free tier = 60 requests/minute (plenty for development)

\---

### STEP 4 — Setup Gmail App Password (for email)

1. Go to your Google Account → Security
2. Enable **2-Factor Authentication** (required)
3. Go to → https://myaccount.google.com/apppasswords
4. Select App: "Mail", Device: "Other" → name it "TunnelKMS"
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
6. Remove spaces: `abcdefghijklmnop`

\---

### STEP 5 — Configure Backend Environment

Navigate to your backend folder:

```bash
cd tunnel-kms/backend
```

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=5000
NODE\_ENV=development

# Paste your MongoDB URI here:
MONGODB\_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/tunnel\_kms

# Generate a random secret (min 32 chars):
JWT\_SECRET=mySuper$ecretKey\_TunnelKMS\_2025\_Change\_This!

JWT\_EXPIRES\_IN=7d

# Your Gmail:
EMAIL\_HOST=smtp.gmail.com
EMAIL\_PORT=587
EMAIL\_USER=youremail@gmail.com
EMAIL\_PASS=abcdefghijklmnop

EMAIL\_FROM=TunnelKMS <youremail@gmail.com>

# Where your frontend runs (for email verification links):
FRONTEND\_URL=http://127.0.0.1:5500

# Paste your Gemini API key:
GEMINI\_API\_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

MAX\_FILE\_SIZE=52428800
```

\---

### STEP 6 — Install Backend Packages

```bash
# Make sure you are in the backend folder:
cd tunnel-kms/backend

# Install all packages:
npm install
```

This installs: express, mongoose, bcryptjs, jsonwebtoken, multer, nodemailer, @google/generative-ai, helmet, pdf-parse, mammoth, and more.

\---

### STEP 7 — Run the Backend Server

```bash
# From the backend folder:
npm run dev        # Development mode (auto-restart on changes)

# OR for production:
npm start
```

You should see:

```
🚀 TunnelKMS Server running on port 5000
✅ MongoDB Connected
✅ Admin user created: admin@tunnelkms.com / Admin@123456
```

Test the server: http://localhost:5000/api/health

\---

### STEP 8 — Run the Frontend

**Option A: VS Code Live Server (Easiest)**

1. Open VS Code
2. Install extension: **"Live Server"** by Ritwick Dey
3. Open the `frontend` folder in VS Code
4. Right-click `index.html` → "Open with Live Server"
5. It opens at: `http://127.0.0.1:5500`

**Option B: Python simple server**

```bash
cd tunnel-kms/frontend
python -m http.server 5500
# Open: http://localhost:5500
```

**Option C: Node http-server**

```bash
npm install -g http-server
cd tunnel-kms/frontend
http-server -p 5500
```

\---

### STEP 9 — Open the Website

Open your browser and go to:

```
http://127.0.0.1:5500
```

You'll see the TunnelKMS splash/landing screen!

**Default Admin Login:**

```
Email:    admin@tunnelkms.com
Password: Admin@123456
```

(Admin account is auto-created on first server start)

\---

### STEP 10 — First Use Guide

1. **Open** http://127.0.0.1:5500 → splash screen → redirects to login
2. **Sign Up** → create a new account → check email for verification link
3. **Verify Email** → click the link in your email
4. **Login** → enter email and password
5. **Complete Profile** → fill in all required fields → click Save
6. **Dashboard** → you're in! Try uploading a document
7. **Upload a PDF** → fill project name, department, type → upload
8. **AI Assistant** → ask questions about your uploaded documents
9. **Admin Panel** → login as admin@tunnelkms.com to manage users

\---

## 🌐 DEPLOYMENT (Make it live online)

### Backend — Deploy to Render (Free)

1. Go to https://render.com → Create account
2. Click "New" → "Web Service"
3. Connect your GitHub repo (push backend folder)
4. Settings:

   * Build Command: `npm install`
   * Start Command: `npm start`
   * Environment: Add all `.env` variables
5. Deploy → get your URL: `https://tunnelkms-api.onrender.com`

### Frontend — Deploy to Netlify (Free)

1. Go to https://netlify.com → Create account
2. Drag \& drop your `frontend` folder onto Netlify
3. Get URL: `https://tunnelkms.netlify.app`
4. Update `FRONTEND\_URL` in backend `.env` to your Netlify URL
5. Update `API\_BASE` in `frontend/js/app.js` to your Render backend URL

### Update API URL for Production

In `frontend/js/app.js`, line 4:

```js
// Change from:
const API\_BASE = 'http://localhost:5000/api';

// To your deployed backend:
const API\_BASE = 'https://tunnelkms-api.onrender.com/api';
```

\---

## 🔧 TROUBLESHOOTING

|Problem|Solution|
|-|-|
|MongoDB connection fails|Check MONGODB\_URI in .env, whitelist your IP in Atlas|
|Email not sending|Check Gmail app password, enable 2FA, use 16-char app password|
|AI returns error|Check GEMINI\_API\_KEY is valid at aistudio.google.com|
|CORS errors|Check FRONTEND\_URL in .env matches where frontend runs|
|"Not authorized"|Token expired — logout and login again|
|File upload fails|Check uploads/ folder permissions, MAX\_FILE\_SIZE|
|Port 5000 in use|Change PORT in .env to 5001 or 5002|

\---

## 🎯 FEATURES CHECKLIST

* ✅ Landing/Splash Page (auto-redirect)
* ✅ Sign Up with email + role selection
* ✅ Email verification (nodemailer)
* ✅ Login with JWT authentication
* ✅ Forgot password / Reset password
* ✅ Profile setup (photo, company, department)
* ✅ Dashboard with analytics cards
* ✅ Drag \& drop file upload
* ✅ Upload modal with metadata form
* ✅ Upload progress animation
* ✅ "Uploading..." → "Uploaded Successfully!" status
* ✅ Unique Document ID (TKM-XXXXXXXX)
* ✅ Documents page with grid view
* ✅ Search \& filter (type, department, sort)
* ✅ View document details modal
* ✅ Download document
* ✅ Viewed history tracking
* ✅ AI Assistant (Gemini) with document context
* ✅ AI references documents in answers
* ✅ "Not available in documents" response when needed
* ✅ Chat history persistence
* ✅ Help Center with FAQ accordion
* ✅ User Profile page with tabs
* ✅ Edit profile + change password
* ✅ Admin Panel (users, docs, analytics)
* ✅ Role management (Admin/Manager/Engineer/Viewer)
* ✅ Activate/Deactivate users
* ✅ Dark mode / Light mode toggle
* ✅ Notifications system
* ✅ Responsive mobile design
* ✅ Professional footer
* ✅ Rate limiting \& security headers

\---

## 📞 TECH STACK SUMMARY

|Layer|Technology|
|-|-|
|Frontend|HTML5, CSS3, Vanilla JavaScript|
|Backend|Node.js + Express.js|
|Database|MongoDB + Mongoose ODM|
|Auth|JWT + bcryptjs|
|Email|Nodemailer (Gmail SMTP)|
|AI|Google Gemini API (gemini-pro)|
|File Upload|Multer (local disk storage)|
|Text Extract|pdf-parse, mammoth|
|Security|Helmet, express-rate-limit, CORS|
|Theme|CSS Variables (Dark/Light mode)|

\---

*TunnelKMS v1.0.0 — Cloud-Based Construction Knowledge Management System
Built for tunnel project teams: Engineers, Managers, Admins*

