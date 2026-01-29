# Production Deployment Guide

## Critical: Preventing Chunk Loading Errors

### The Problem

Chunk loading errors occur when:

1. Users have an old version of your site cached in their browser
2. You deploy a new build with different chunk filenames
3. Their browser tries to load old chunks that no longer exist (404)

### The Solution

This project now uses **git commit hashes** as build IDs instead of timestamps. This ensures:

- ✅ Chunks have **stable names** between deployments
- ✅ Users can **reload successfully** without errors
- ✅ **Hard reloads** clear browser cache automatically

---

## Deployment Steps

### 1. Before Deploying

```bash
# Ensure you're on the latest commit
git pull origin main

# Check current commit (this will be your build ID)
git log -1 --format="%H"
```

### 2. Build the Application

```bash
cd nihemart
npm run build
```

The build will:

- Use the git commit hash as the build ID
- Generate chunks with stable names
- Output build info to console

### 3. Deploy to Production

**Option A: Deploy via Git (Recommended)**

```bash
# Commit your changes
git add .
git commit -m "Your commit message"
git push origin main

# Your hosting provider will automatically:
# - Use the git commit hash as build ID
# - Generate stable chunk names
# - Deploy without chunk mismatch issues
```

**Option B: Manual Deploy**

```bash
# Upload the entire .next directory
# Ensure to preserve the directory structure

# Important files to upload:
# - .next/static/chunks/*
# - .next/server/*
# - .next/BUILD_ID
# - All other .next contents
```

### 4. Verify Deployment

```bash
# Run the verification script
node scripts/verify-deployment.js
```

Check for:

- ✅ Build manifest exists
- ✅ Chunks directory populated
- ✅ No missing files

---

## Environment Variables

### Required for Build ID Consistency

```env
# Option 1: Let git handle it (Recommended)
# The build will automatically use git commit hash

# Option 2: Manual build ID (if git not available)
BUILD_ID=your-stable-build-id-here

# Option 3: Vercel/Platform-provided (automatic)
VERCEL_GIT_COMMIT_SHA=auto-provided-by-vercel
```

### DO NOT USE

❌ `BUILD_ID=build-${Date.now()}` - Creates unstable chunks
❌ Timestamp-based IDs - Causes chunk mismatches

---

## Cache Headers (Server Configuration)

### Recommended Nginx Configuration

```nginx
location /_next/static/ {
    # Cache static chunks for 1 year
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location /_next/data/ {
    # Cache data for shorter period
    add_header Cache-Control "public, max-age=3600, must-revalidate";
}

# Never cache the HTML pages
location / {
    add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

### Apache Configuration

```apache
<IfModule mod_headers.c>
    # Cache static chunks
    <FilesMatch "\\.(?:js|css|woff2?|ttf|otf)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Don't cache HTML
    <FilesMatch "\\.html$">
        Header set Cache-Control "public, max-age=0, must-revalidate"
    </FilesMatch>
</IfModule>
```

---

## Troubleshooting

### If Users Still See Chunk Errors

1. **Check Build ID Consistency**

   ```bash
   cat .next/BUILD_ID
   ```

   Should show a git commit hash, NOT a timestamp

2. **Verify Git is Available**

   ```bash
   git --version
   ```

   If git is not available during build, set `BUILD_ID` env var manually

3. **Clear CDN/Server Cache**
   - CloudFlare: Purge all cache
   - Server: Restart nginx/apache
   - Users: Will auto-reload with hard cache clear

4. **Check Console Logs**
   - Look for: "Using git commit hash as build ID"
   - Should NOT see: "No git hash available"

### Emergency Fix (If Errors Persist)

```bash
# 1. Set a fixed build ID
export BUILD_ID="v1.0.0"

# 2. Rebuild
npm run build

# 3. Deploy immediately

# 4. Clear all caches (CDN, server, browser)
```

---

## Automatic Error Recovery

The app now includes automatic error recovery:

1. **First Error**: Normal reload (keeps cache)
2. **Second Error**: Hard reload with cache bust
3. **Third+ Error**: Shows user-friendly error UI with manual reload button

### User Experience

- Most users: Automatic reload, no interruption
- Persistent errors: Clear "Reload Application" button
- No infinite reload loops
- 5-second throttle between reload attempts

---

## Best Practices

### ✅ DO

- Use git for deployments when possible
- Set stable BUILD_ID if git unavailable
- Run verification script after build
- Monitor error logs for chunk errors
- Deploy during low-traffic periods

### ❌ DON'T

- Use timestamps for BUILD_ID
- Deploy without verifying build
- Ignore chunk error warnings
- Skip cache header configuration
- Deploy during peak hours

---

## Monitoring

### Check for Chunk Errors in Production

```javascript
// Browser console monitoring
sessionStorage.getItem("chunk-error-reloaded"); // Should be null
sessionStorage.getItem("chunk-error-ui-shown"); // Should be null
```

### Server Logs

Monitor for:

- `404` errors on `/_next/static/chunks/*`
- Unusual spike in page reloads
- Build ID mismatches

---

## Support

If chunk errors persist after following this guide:

1. Check git commit hash in `.next/BUILD_ID`
2. Verify cache headers are set correctly
3. Clear all CDN/server caches
4. Contact development team with:
   - Build ID from logs
   - Browser console output
   - Network tab showing failed chunk requests
