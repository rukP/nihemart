# 🚨 CRITICAL: Fix Chunk Errors - Deployment Steps

## The Problem

Users have **old cached HTML** that references chunks that no longer exist after your deployment. The chunks have different hashes now because you deployed new code.

## ✅ Step-by-Step Fix

### 1. Clear Old Build on Server

```bash
# SSH into your server or use your hosting control panel
cd /home/u206593966/domains/nihemart.rw/public_html

# CRITICAL: Delete the old .next folder completely
rm -rf .next

# Also clear node_modules to be safe
rm -rf node_modules
```

### 2. Deploy Fresh Build

```bash
# On your local machine
cd nihemart

# Make sure you have the latest code
git pull origin main

# Install dependencies
pnpm install

# Build fresh
pnpm build

# Deploy the ENTIRE .next folder to server
# Make sure ALL chunks are uploaded, not just the changed ones
```

### 3. Clear Server Cache (Important!)

If you're using any caching layer (Cloudflare, server cache, etc.):

- **Purge ALL cache** for nihemart.rw
- Don't just purge HTML, purge **EVERYTHING** including JS files

### 4. Force Users to Hard Reload

Since users have old cached HTML, you have two options:

**Option A: Wait it Out**

- Users will see the error overlay
- They click "Reload Application"
- They get the new code
- Problem solved for that user

**Option B: Clear Browser Cache (Tell Users)**

- Press `Ctrl+Shift+R` (Windows/Linux)
- Press `Cmd+Shift+R` (Mac)

## Why This Happened

Your build is using **git commit hash as build ID** (correct!), but:

1. ❌ Old deployment had chunks: `7801-OLDHASH.js`, `9504-OLDHASH.js`
2. ✅ New deployment created chunks: `7801-NEWHASH.js`, `9504-NEWHASH.js`
3. ❌ Users' browsers cached old HTML pointing to `7801-OLDHASH.js`
4. 💥 Server doesn't have `7801-OLDHASH.js` anymore → 404 errors

## Verify the Fix

After deploying:

```bash
# Check that new chunks exist on server
cd /home/u206593966/domains/nihemart.rw/public_html
ls -la .next/static/chunks/

# You should see all the new chunk files
```

### Check in Browser

1. Open nihemart.rw
2. Open DevTools → Network tab
3. Hard refresh (`Ctrl+Shift+R`)
4. All chunks should load with **200 status** (not 404)
5. No error overlay should appear

## 🎯 Long-term Prevention

### For cPanel/Shared Hosting:

Create a deployment script `deploy.sh`:

```bash
#!/bin/bash

# Navigate to site directory
cd /home/u206593966/domains/nihemart.rw/public_html

# Backup current build (just in case)
mv .next .next.backup_$(date +%Y%m%d_%H%M%S)

# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Build fresh
pnpm build

# Restart server (if you have Node.js running)
pm2 restart nihemart || echo "No PM2 process to restart"

# Clean up old backups (keep last 3)
ls -dt .next.backup_* | tail -n +4 | xargs rm -rf

echo "✅ Deployment complete!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

Then deploy with:

```bash
./deploy.sh
```

## 📋 Deployment Checklist

Before each deployment:

- [ ] Clear old `.next` folder on server
- [ ] Deploy ALL files, not just changed ones
- [ ] Purge CDN/cache (if using Cloudflare, etc.)
- [ ] Test in incognito window
- [ ] Check Network tab for 404s

## If Problems Persist

If users still see errors after proper deployment:

1. **They have stale browser cache** → Tell them to hard refresh
2. **CDN/proxy cache** → Purge Cloudflare or other CDN cache
3. **Service worker** → Check if you have a service worker caching old files

### Check Service Worker

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then((registrations) => {
   registrations.forEach((registration) => registration.unregister());
   console.log("Service workers cleared");
   location.reload();
});
```

## 🚀 Expected Result

After proper deployment:

- ✅ No 404 errors for chunks
- ✅ No error overlay on page load
- ✅ Site works perfectly for all users
- ✅ Git-based build ID keeps chunks stable between deployments **of the same code**

The error recovery system will still work for rare edge cases, but you shouldn't see it during normal deployments.
