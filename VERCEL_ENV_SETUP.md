# Vercel Environment Variables Setup Guide

This guide will help you configure environment variables for your Vercel deployment.

## Required Environment Variables

### 1. Supabase Configuration

These are **required** for your app to connect to Supabase:

- **`VITE_SUPABASE_URL`**: Your Supabase project URL
  - Value: `https://tbklpgmjkcncafpinmum.supabase.co`
  - You can find this in your Supabase Dashboard → Settings → API

- **`VITE_SUPABASE_ANON_KEY`**: Your Supabase anonymous/public key
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2xwZ21qa2NuY2FmcGlubXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjMyMjQsImV4cCI6MjA3OTIzOTIyNH0.HpFZ3qM0cBT65mYMuw9xALRTF5U`
  - You can find this in your Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

## Optional Environment Variables

These are only needed if you use specific features:

- **`VITE_APP_TITLE`**: Custom app title (defaults to "App" if not set)
- **`VITE_FRONTEND_FORGE_API_KEY`**: API key for Map component (if using maps)
- **`VITE_FRONTEND_FORGE_API_URL`**: Forge API URL (defaults to `https://forge.butterfly-effect.dev`)
- **`VITE_OAUTH_PORTAL_URL`**: OAuth portal URL (if using OAuth login)
- **`VITE_APP_ID`**: App ID for OAuth (if using OAuth login)

## Step-by-Step Instructions

### Method 1: Using Vercel Dashboard (Recommended)

1. **Go to your Vercel project**
   - Navigate to [vercel.com](https://vercel.com)
   - Sign in and select your project

2. **Open Settings**
   - Click on your project
   - Go to the **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add Environment Variables**
   - Click the **Add New** button
   - For each variable:
     - **Key**: Enter the variable name (e.g., `VITE_SUPABASE_URL`)
     - **Value**: Enter the variable value
     - **Environment**: Select which environments to apply to:
       - ✅ **Production** (for your live site)
       - ✅ **Preview** (for preview deployments)
       - ✅ **Development** (optional, for local development)
     - Click **Save**

4. **Add Required Variables**
   Add these two variables:
   
   ```
   VITE_SUPABASE_URL = https://tbklpgmjkcncafpinmum.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2xwZ21qa2NuY2FmcGlubXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjMyMjQsImV4cCI6MjA3OTIzOTIyNH0.HpFZ3qM0cBT65mYMuw9xALRTF5U
   ```

5. **Redeploy**
   - After adding variables, go to the **Deployments** tab
   - Click the **⋯** (three dots) menu on your latest deployment
   - Select **Redeploy**
   - Or push a new commit to trigger a new deployment

### Method 2: Using Vercel CLI

If you have the Vercel CLI installed:

```bash
# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# For preview environments too
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_ANON_KEY preview
```

## Important Notes

⚠️ **Security Best Practices:**
- Never commit environment variables to your repository
- Use different Supabase keys for production vs development if needed
- The `anon` key is safe to expose in frontend code (it's public by design)
- If you need to rotate keys, update them in Vercel and redeploy

✅ **Vite Environment Variables:**
- All environment variables must be prefixed with `VITE_` to be accessible in your Vite app
- Variables are embedded at build time, so you need to redeploy after changing them

🔄 **After Adding Variables:**
- Environment variables are only available after a new deployment
- If you add variables to an existing deployment, you must redeploy

## Verifying Your Setup

After deployment, you can verify your environment variables are working:

1. Open your deployed site
2. Open browser DevTools (F12)
3. Check the Console for any Supabase connection errors
4. Try using features that require Supabase (like viewing initiatives)

If you see connection errors, double-check:
- Variable names are exactly correct (case-sensitive)
- Values are correct (no extra spaces)
- You've redeployed after adding the variables

## Troubleshooting

**Problem**: App works locally but not on Vercel
- **Solution**: Make sure you've added the environment variables in Vercel and redeployed

**Problem**: "Supabase client not initialized" errors
- **Solution**: Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly

**Problem**: Variables not updating after changes
- **Solution**: You must redeploy after changing environment variables

