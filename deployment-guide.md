# BizFlow ERP - Hostinger Deployment Guide

## 📋 Στοιχεία Hostinger

**FTP Details:**
- Host: `82.198.227.7` or `ftp.liougiourou.gr`
- Username: `u306507842`
- Password: `[your_hostinger_password]`
- Port: `21` (FTP) or `22` (SFTP)

**Database Details:**
- Host: `localhost`
- Database: `u306507842_bizflow_erp`
- Username: `u306507842_bizflow_user`  
- Password: `Beroiwths#2002`

## 🚀 Deployment Steps

### Step 1: Upload Files via FTP

1. **Connect to FTP:**
   ```
   Host: 82.198.227.7
   Username: u306507842
   Password: [your_password]
   ```

2. **Upload Structure:**
   ```
   public_html/
   └── erp/
       ├── server.js
       ├── app.js
       ├── package.json
       ├── .env.production (rename to .env)
       ├── config/
       ├── models/
       ├── routes/
       ├── services/
       ├── middleware/
       ├── utils/
       └── frontend/
   ```

### Step 2: Setup Node.js in Hostinger

1. Go to **Hostinger Panel** → **Website** → **Advanced** 
2. Find **Node.js** section
3. **Enable Node.js**
4. Set **Node.js Version**: 18+ 
5. Set **Startup File**: `server.js`
6. Set **Application Root**: `/public_html/erp`

### Step 3: Install Dependencies

1. In Hostinger File Manager → **erp** folder
2. Open **Terminal** or **SSH**
3. Run: `npm install`

### Step 4: Environment Setup

1. Rename `.env.production` to `.env`
2. Verify database credentials
3. Update domain settings in `.env`

### Step 5: Test Application

1. **API Test**: `https://liougiourou.gr/erp/health`
2. **Frontend**: `https://liougiourou.gr/erp/app`
3. **API Docs**: `https://liougiourou.gr/erp/api-docs`

## 🔧 Troubleshooting

### Common Issues:
- **Permission errors**: `chmod 755` on directories
- **Node modules**: Run `npm install` in server
- **Database**: Check MySQL permissions
- **Port issues**: Hostinger uses different ports

## 📱 Frontend Access

**Login URL**: `https://liougiourou.gr/erp/app`

**Test User** (after registration):
- Email: `admin@liougiourou.gr`
- Password: `[create_strong_password]`

## 🛠️ Post-Deployment

1. **Register first admin user**
2. **Create company profile**  
3. **Test invoice creation**
4. **Configure MyDATA** (optional)
5. **Setup email notifications**

## 📞 Support

If you need help, check:
1. Browser Console (F12)
2. Server logs in Hostinger panel
3. Database connections
4. Node.js app status

---
**BizFlow ERP v2.0** - Ready for Greek Business! 🇬🇷