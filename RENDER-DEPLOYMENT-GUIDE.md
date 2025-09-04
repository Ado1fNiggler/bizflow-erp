# 🚀 BizFlow ERP - Deploy to Render.com (ΔΩΡΕΑΝ)

## 📋 Γιατί Render αντί για Hostinger Shared;
- ✅ **ΔΩΡΕΑΝ Node.js hosting** (750 ώρες/μήνα)
- ✅ **ΔΩΡΕΑΝ PostgreSQL database**
- ✅ **Αυτόματο deployment από GitHub**
- ✅ **SSL certificate included**
- ✅ **Μπορείς να συνδέσεις το domain σου (liougiourou.gr)**

---

## 🔧 ΒΗΜΑ 1: Προετοιμασία στο GitHub

### 1.1 Δημιούργησε GitHub Account (αν δεν έχεις)
1. Πήγαινε στο: https://github.com
2. Sign up (δωρεάν)

### 1.2 Upload το Project στο GitHub
1. Δημιούργησε νέο repository: https://github.com/new
   - Repository name: `bizflow-erp`
   - Private repository: ✅
   - Μην προσθέσεις README, .gitignore ή license

2. Upload από command line:
```bash
cd C:\Users\steli\Desktop\bizflow-erp\backend
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bizflow-erp.git
git push -u origin main
```

---

## 🌐 ΒΗΜΑ 2: Setup στο Render.com

### 2.1 Δημιούργησε Render Account
1. Πήγαινε: https://render.com
2. **Sign up with GitHub** (πιο εύκολο)
3. Authorize Render για το GitHub

### 2.2 Δημιούργησε PostgreSQL Database
1. Dashboard → **New +** → **PostgreSQL**
2. Συμπλήρωσε:
   - Name: `bizflow-db`
   - Database: `bizflow_erp`
   - User: `bizflow_user`
   - Region: `Frankfurt (EU Central)`
   - Plan: **Free**
3. Κάνε κλικ **Create Database**
4. Περίμενε 2-3 λεπτά να δημιουργηθεί
5. Αντέγραψε το **Internal Database URL**

### 2.3 Deploy το Backend
1. Dashboard → **New +** → **Web Service**
2. **Connect a repository** → Επίλεξε `bizflow-erp`
3. Συμπλήρωσε:
   - Name: `bizflow-erp`
   - Region: `Frankfurt (EU Central)`
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: **Free**

### 2.4 Environment Variables
Κάνε κλικ **Advanced** και πρόσθεσε:

```env
NODE_ENV=production
DATABASE_URL=[paste Internal Database URL from step 2.2]
JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-session-secret-key-change-this
EMAIL_FROM=noreply@liougiourou.gr
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
API_BASE_URL=https://bizflow-erp.onrender.com
CLIENT_URL=https://bizflow-erp.onrender.com/app
CORS_ORIGIN=https://bizflow-erp.onrender.com
```

### 2.5 Deploy!
1. Κάνε κλικ **Create Web Service**
2. Περίμενε 5-10 λεπτά για το πρώτο deployment
3. Θα πάρεις URL: `https://bizflow-erp.onrender.com`

---

## 🔗 ΒΗΜΑ 3: Σύνδεση Custom Domain

### 3.1 Στο Render
1. Πήγαινε στο service σου
2. **Settings** → **Custom Domains**
3. Add domain: `erp.liougiourou.gr`
4. Θα σου δώσει CNAME record

### 3.2 Στο Hostinger
1. Login στο Hostinger Panel
2. **Domains** → **liougiourou.gr** → **DNS Zone**
3. Add new record:
   - Type: `CNAME`
   - Name: `erp`
   - Value: `[το CNAME από Render]`
   - TTL: `14400`
4. Save

### 3.3 Περίμενε DNS Propagation
- 5-30 λεπτά συνήθως
- Μετά: https://erp.liougiourou.gr θα δουλεύει!

---

## ✅ ΒΗΜΑ 4: Test URLs

### Μετά το deployment:
1. **API Health**: https://bizflow-erp.onrender.com/health
2. **Application**: https://bizflow-erp.onrender.com/app  
3. **API Docs**: https://bizflow-erp.onrender.com/api-docs

### Με custom domain:
1. **API Health**: https://erp.liougiourou.gr/health
2. **Application**: https://erp.liougiourou.gr/app
3. **API Docs**: https://erp.liougiourou.gr/api-docs

---

## 🎯 First Setup

1. Πήγαινε: https://bizflow-erp.onrender.com/app
2. Register πρώτος χρήστης
3. Email: `admin@liougiourou.gr`
4. Create company profile

---

## ⚠️ Σημαντικό για Free Tier

**Render Free Tier περιορισμοί:**
- Η εφαρμογή "κοιμάται" μετά από 15 λεπτά αδράνειας
- Πρώτο request μετά από αδράνεια = 30-60 sec delay
- 750 ώρες/μήνα (αρκετά για production)
- Database: 1GB storage

**Για να μην "κοιμάται":**
- Upgrade σε Starter plan ($7/μήνα)
- Ή χρήση UptimeRobot για ping κάθε 10 λεπτά (δωρεάν)

---

## 📞 Troubleshooting

### Build Failed:
- Check build logs στο Render Dashboard
- Verify package.json dependencies

### Database Connection:
- Check DATABASE_URL environment variable
- Verify database is running

### Domain not working:
- Check DNS settings
- Wait for propagation (up to 24h)

---

## 🎉 Ready!
Το BizFlow ERP θα τρέχει στο cloud με:
- ✅ Auto-deployment από GitHub
- ✅ Free SSL certificate  
- ✅ PostgreSQL database
- ✅ Custom domain support

**Θέλεις βοήθεια με κάποιο από τα βήματα;**