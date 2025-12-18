# GitHub Pages Deployment Setup

This guide will help you deploy the frontend to GitHub Pages.

## Prerequisites

1. Your code is in a GitHub repository
2. You have a Railway backend URL (e.g., `https://zerosum-production.up.railway.app`)

## Step 1: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
4. Save

## Step 2: Set GitHub Secret for API URL

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `VITE_API_URL`
5. Value: Your Railway backend URL with `/api` at the end
   - Example: `https://zerosum-production.up.railway.app/api`
6. Click **Add secret**

## Step 3: Configure Base Path

The workflow **automatically detects** the base path based on your repository name:

- If repo is `username.github.io` → base path is `/` (root domain)
- If repo has a different name (e.g., `zeroSum`) → base path is `/repo-name/`

**Your GitHub Pages URL will be:**
- `https://username.github.io` (if repo is `username.github.io`)
- `https://username.github.io/repo-name` (if repo has a different name)

### Manual Override (if needed)

If you need to override the auto-detected base path (e.g., for custom domain):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `GITHUB_PAGES_BASE`
4. Value: Your desired base path (e.g., `/` for root, `/zeroSum/` for subpath)
5. Click **Add secret**

## Step 4: Update CORS on Railway Backend

Make sure your Railway backend allows requests from your GitHub Pages URL:

1. Go to Railway → Your backend service → Variables
2. Set `FRONTEND_URL` to your GitHub Pages URL:
   - Example: `https://username.github.io` or `https://username.github.io/repo-name`

## Step 5: Deploy

1. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

2. GitHub Actions will automatically build and deploy
3. Check the **Actions** tab to see the deployment progress
4. Your site will be available at:
   - `https://username.github.io` (if repo is `username.github.io`)
   - `https://username.github.io/repo-name` (if repo has a different name)

   **For your repo (`txwei/zeroSum`), the URL is: `https://txwei.github.io/zeroSum`**

## Troubleshooting

### Build fails
- Check that `VITE_API_URL` secret is set correctly
- Make sure the path includes `/api` at the end

### CORS errors
- Verify `FRONTEND_URL` in Railway matches your GitHub Pages URL exactly

### 404 errors on routes
- Make sure the base path in `vite.config.ts` matches your deployment path
- Check that React Router is configured correctly

### API calls fail
- Verify `VITE_API_URL` secret is set
- Check browser console for the actual API URL being used
- Ensure Railway backend is running and accessible

