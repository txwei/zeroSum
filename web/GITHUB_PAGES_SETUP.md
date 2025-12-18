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

## Step 3: Configure Base Path (if needed)

### Option A: Deploy to `username.github.io` (root domain)

If your repository is named `username.github.io`, the base path is already set to `/` in `vite.config.ts`.

### Option B: Deploy to `username.github.io/repo-name` (subpath)

If your repository has a different name, you need to set the base path:

1. Update `.github/workflows/deploy-frontend.yml`:
   ```yaml
   - name: Build
     working-directory: ./web
     env:
       VITE_API_URL: ${{ secrets.VITE_API_URL || 'https://zerosum-production.up.railway.app/api' }}
       GITHUB_PAGES_BASE: '/your-repo-name/'  # Add this line
     run: npm run build
   ```

2. Replace `your-repo-name` with your actual repository name

## Step 4: Update CORS on Railway Backend

Make sure your Railway backend allows requests from your GitHub Pages URL:

1. Go to Railway → Your backend service → Variables
2. Set `FRONTEND_URL` to your GitHub Pages URL:
   - Example: `https://username.github.io` or `https://username.github.io/repo-name`

## Step 5: Deploy

1. Push your code to the `main` branch
2. GitHub Actions will automatically build and deploy
3. Check the **Actions** tab to see the deployment progress
4. Your site will be available at:
   - `https://username.github.io` (if repo is `username.github.io`)
   - `https://username.github.io/repo-name` (if repo has a different name)

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

