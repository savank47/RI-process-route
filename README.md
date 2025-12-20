# Auto Parts Production Tracker - Vercel + MongoDB Deployment Guide

## 🎯 **Overview**

This is a complete production tracking system for your auto parts manufacturing business. It uses:
- **Frontend**: HTML/CSS/JavaScript (runs in browser)
- **Backend**: Node.js/Express (Vercel serverless functions)
- **Database**: MongoDB Atlas (free cloud database)

## 📁 **Project Structure**

```
├── api/
│   ├── health.js       # API health check
│   ├── processes.js    # Process library CRUD
│   ├── items.js        # Items management
│   └── batches.js      # Production batches CRUD
├── package.json        # Node.js dependencies
├── vercel.json         # Vercel configuration
├── .env                # MongoDB connection (local testing)
├── index.html          # Frontend application
└── README.md           # This file
```

## 🚀 **Deployment Steps (10 Minutes)**

### **Step 1: MongoDB Atlas Setup (3 minutes)**

1. **Go to MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
2. **Create Account** (if you don't have one)
3. **Create a New Cluster**:
   - Choose "Shared" (Free Tier)
   - Pick any region close to you
   - Click "Create Cluster"

4. **Create Database User**:
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Authentication Method: "Password"
   - Username: `trackeruser`
   - Password: `yourSecurePassword123` (choose your own)
   - Click "Add User"

5. **Network Access**:
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

6. **Get Connection String**:
   - Go back to "Clusters"
   - Click "Connect" on your cluster
   - Select "Connect your application"
   - Copy the connection string (looks like below):
   ```
   mongodb+srv://trackeruser:yourSecurePassword123@cluster0.xxxxx.mongodb.net/auto_parts_tracker?retryWrites=true&w=majority
   ```
   - **Important**: Replace `yourSecurePassword123` with your actual password

### **Step 2: GitHub Repository Setup (2 minutes)**

1. **Create GitHub Repository**:
   - Go to github.com
   - Click "+" → "New repository"
   - Name: `auto-parts-tracker`
   - Keep it **Public** (easier for Vercel)
   - Click "Create repository"

2. **Upload Files**:
   - You can drag and drop all the files I created into GitHub
   - Or use Git commands:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/auto-parts-tracker.git
   git push -u origin main
   ```

### **Step 3: Vercel Deployment (3 minutes)**

1. **Go to Vercel**: https://vercel.com
2. **Sign Up**: Click "Continue with GitHub"
3. **Create New Project**:
   - Click "Add New" → "Project"
   - Select your GitHub repository (`auto-parts-tracker`)
   - Click "Import"

4. **Configure Project**:
   - **Project Name**: `auto-parts-tracker` (auto-filled)
   - **Framework Preset**: Vercel will auto-detect Node.js
   - **Root Directory**: Leave as is
   - **Build Command**: Leave empty (auto-detected)
   - **Output Directory**: Leave empty

5. **Add Environment Variable**:
   - Under "Environment Variables", click "Add"
   - **Key**: `MONGODB_URI`
   - **Value**: Paste your MongoDB connection string from Step 1
   - Click "Add"

6. **Deploy**:
   - Click "Deploy"
   - Wait ~1-2 minutes for deployment to complete

7. **Get Your URL**:
   - Once deployed, Vercel shows your URL (like `https://auto-parts-tracker.vercel.app`)
   - **Copy this URL** - you'll need it!

### **Step 4: Update Frontend (2 minutes)**

1. **Edit `index.html`**:
   - Find this line (around line 650):
   ```javascript
   const API_BASE_URL = `${window.location.origin}/api`;
   ```
   
2. **Update it** (if Vercel didn't auto-detect):
   ```javascript
   const API_BASE_URL = 'https://auto-parts-tracker.vercel.app/api';
   ```
   - Replace with your actual Vercel URL

3. **Commit Changes**:
   ```bash
   git add index.html
   git commit -m "Update API URL"
   git push
   ```
   - Vercel will auto-redeploy

## 🎯 **How to Use Your App**

### **Access Your Application:**
- **Frontend**: `https://auto-parts-tracker.vercel.app`
- **API Base**: `https://auto-parts-tracker.vercel.app/api`

### **First Time Setup:**

1. **Open your app URL** in browser
2. **Check API Status** (top right corner):
   - ✅ Green dot = Connected to MongoDB
   - ❌ Red dot = Connection issue (check Step 5 below)

3. **Go to Process Library Tab**:
   - Click "Load Default Processes"
   - This adds: Raw Material → Cutting → Forging → CNC → VMC → Heat Treatment → Grinding → Packaging → Dispatch

4. **Go to Items Master Tab**:
   - Create your auto parts items
   - Click processes from library to build routes
   - Drag to reorder if needed

5. **Go to Production Batches Tab**:
   - Select an item → process route auto-fills
   - Create batch with number, quantity, priority

6. **Go to Batch Tracking Tab**:
   - Select batch
   - Use Quick Actions to update status
   - Track progress in real-time

## 🔧 **Testing Locally (Before Deployment)**

If you want to test on your computer:

1. **Install Node.js**: https://nodejs.org (v18+)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file**:
   ```env
   MONGODB_URI=mongodb+srv://trackeruser:yourpassword@cluster...
   ```

4. **Run Vercel locally**:
   ```bash
   npx vercel dev
   ```
   - This starts both frontend and backend
   - Usually on `http://localhost:3000`

5. **Open browser**: `http://localhost:3000`

## 📱 **Mobile Access**

Your app works on any device:
1. Open your Vercel URL on phone
2. Add to Home Screen (iOS: Share → Add to Home Screen)
3. Works like a native app!

## 💰 **Cost**

**FREE** - Vercel + MongoDB Atlas free tiers are sufficient for:
- ✅ Unlimited users
- ✅ Thousands of requests/month
- ✅ 512MB database storage

You won't pay anything for years unless you have heavy commercial usage.

## 🆘 **Troubleshooting**

### **API shows "Offline" (Red dot)**

**Check MongoDB URI format:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority
```

**Common issues:**
- ❌ Missing password in URI
- ❌ Wrong database name
- ✅ Correct: `auto_parts_tracker` (in your case)
- ❌ Incorrect: `mydb`, `test`, etc.

**Check MongoDB Network:**
- IP Access: 0.0.0.0/0 (Allow from anywhere)
- Database User: Has correct password
- Cluster: Is it running? (Should show "Active")

### **Vercel Deployment Fails**

**Check logs in Vercel dashboard:**
- Go to your Vercel project
- Click "Deployments" → Click failed deployment
- Check "Logs" tab

**Common issues:**
- Missing `MONGODB_URI` environment variable
- Syntax error in code (rare)

### **CORS Errors**

If you see CORS errors in console:
- The backend already has CORS enabled
- Make sure you're using the correct API URL
- Should be: `https://your-app.vercel.app/api`

### **Can't Connect to Database**

**Test connection manually:**
1. Go to Vercel dashboard
2. Click "Storage" tab
3. If MongoDB shows "Not Connected", click "Connect"
4. Follow the prompts

## 📊 **Monitoring**

**Vercel Dashboard:**
- See deployments, logs, analytics
- URL: https://vercel.com/YOUR-USERNAME/auto-parts-tracker

**MongoDB Atlas:**
- See database size, queries, performance
- URL: https://cloud.mongodb.com

## 🔄 **Updating Your App**

To update the code:

1. Make changes locally
2. Test with `npx vercel dev`
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
4. Vercel auto-deploys in ~1 minute

## 🎉 **You're Live!**

Your production tracking system is now:
- ✅ **Deployed** on Vercel
- ✅ **Connected** to MongoDB Atlas
- ✅ **Accessible** from anywhere
- ✅ **Multi-user** ready
- ✅ **Free** to run

**Next Steps:**
1. Share your Vercel URL with your team
2. Start adding items and processes
3. Track your first production batch!

## 💡 **Pro Tips**

- **Backup Data**: Use the "Export Data" button regularly
- **Import Data**: Use "Import Data" to restore from backup
- **Monitor Usage**: Check Vercel dashboard for traffic
- **Scale Up**: If you outgrow free tier, Vercel Pro is $20/month

## 📞 **Support**

**Vercel Documentation**: https://vercel.com/docs  
**MongoDB Atlas Docs**: https://docs.atlas.mongodb.com  
**Need Help?**: Check the troubleshooting section above

---

**Ready to track your production? 🚀**

Your app is now live on the cloud with professional-grade infrastructure!
