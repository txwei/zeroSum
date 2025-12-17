# Zero-Sum Game Tracker

A web application for tracking earnings and losses in home games (poker, mahjong, etc.) with automatic zero-sum validation and multi-user support.

## Features

- User authentication (signup/login)
- User profiles with username and display name
- Game session creation with participant selection
- Easy transaction input with real-time zero-sum validation
- Historical game tracking
- Cumulative earnings/losses per user across all games

## Tech Stack

- **Web**: React with TypeScript, Vite, Tailwind CSS
- **API**: Node.js with Express, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt password hashing

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB connection string (from MongoDB Atlas or local MongoDB instance)
- npm or yarn

### Step 1: Configure Environment Variables

**Important**: All sensitive credentials are stored in a `.env` file in the `api/` directory. This file is not committed to git for security.

1. Navigate to the `api` directory:
   ```bash
   cd api
   ```

2. Create a `.env` file in the `api/` directory (this file should not exist yet):
   ```bash
   touch .env
   ```

3. Open the `.env` file and add the following configuration:
   ```
   PORT=5001
   MONGODB_URI=your-mongodb-connection-string-here
   JWT_SECRET=your-secret-key-here-change-in-production
   ```

4. **Replace the values:**
   - `MONGODB_URI`: Paste your MongoDB connection string here. Examples:
     - Local MongoDB: `mongodb://localhost:27017/zerosum`
     - MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/zerosum?retryWrites=true&w=majority`
   - `JWT_SECRET`: Use a long, random string for production (e.g., generate with `openssl rand -base64 32`)

**Security Note**: Never commit the `.env` file to git. It's already included in `.gitignore`.

### Step 2: Install Dependencies

**API Dependencies:**
```bash
cd api
npm install
```

**Web Dependencies:**
```bash
cd web
npm install
```

### Step 3: Start the Application

You need to run both the API server and the web application. Use two separate terminal windows/tabs.

**Terminal 1 - Start the API Server:**
```bash
cd api
npm run dev
```

You should see:
- `Server is running on port 5001`
- `MongoDB connected successfully`

If you see a MongoDB connection error, verify your `MONGODB_URI` in the `.env` file is correct.

**Terminal 2 - Start the Web Application:**
```bash
cd web
npm run dev
```

You should see:
- `Local: http://localhost:3000`

### Step 4: Create User Accounts

You can create accounts in two ways:

**Option A: Pre-create accounts for your friends (Recommended)**

Use the admin script to create user accounts:

```bash
cd api
npm run create-user <username> "<displayName>" <password>
```

Example:
```bash
npm run create-user alice "Alice Smith" password123
npm run create-user bob "Bob Johnson" mypass456
```

**Option B: Use the registration page**

Friends can create their own accounts by visiting the signup page at `http://localhost:3000/signup`.

### Step 5: Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the login page. Log in with the credentials you created!

### Troubleshooting

- **MongoDB connection error**: Check that your `MONGODB_URI` in `api/.env` is correct and that MongoDB is running (if using local MongoDB)
- **Port already in use**: If port 5001 or 3000 is already in use, you can change `PORT=5001` in `api/.env` (and update the proxy in `web/vite.config.ts` to match)
- **Module not found errors**: Make sure you've run `npm install` in both `api/` and `web/` directories

## Project Structure

```
zeroSum/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── db/
│   │   └── server.ts
│   └── package.json
├── web/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── api/
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Deployment

### Deploying to Railway (Backend) and Vercel (Frontend)

#### Prerequisites
- MongoDB Atlas account (free tier available)
- Railway account (free tier with $5 credit/month)
- Vercel account (free tier available)
- GitHub repository with your code

#### Step 1: Set Up MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get your connection string (replace `<password>` with your password)
5. Add IP whitelist: `0.0.0.0/0` (for development) or Railway's IP ranges

#### Step 2: Deploy Backend to Railway
1. Go to [Railway](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Click "Add Service" → "GitHub Repo"
5. **Important**: In the service settings, set the **Root Directory** to `api`
6. Go to "Variables" tab and add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   - `FRONTEND_URL`: Will set this after Vercel deployment (e.g., `https://your-app.vercel.app`)
7. Railway will automatically:
   - Detect Node.js
   - Run `npm install`
   - Run `npm run build`
   - Run `npm start`
8. Copy your Railway URL (e.g., `https://your-api.up.railway.app`)

#### Step 3: Deploy Frontend to Vercel
1. Go to [Vercel](https://vercel.com) and sign up
2. Click "Add New Project" → Import your GitHub repository
3. **Important**: Set the **Root Directory** to `web`
4. Configure build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variable:
   - `VITE_API_URL`: Your Railway backend URL + `/api` (e.g., `https://your-api.up.railway.app/api`)
6. Click "Deploy"
7. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

#### Step 4: Update Backend CORS
1. Go back to Railway
2. Update the `FRONTEND_URL` environment variable with your Vercel URL
3. Railway will automatically redeploy

#### Step 5: Test Your Deployment
- Frontend: Visit your Vercel URL
- Backend health check: `https://your-api.up.railway.app/api/health`
- Test login/signup functionality

#### Troubleshooting
- **Railway build fails**: Check that Root Directory is set to `api`
- **Vercel build fails**: Check that Root Directory is set to `web`
- **CORS errors**: Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
- **API not reachable**: Check Railway logs and ensure the service is running
- **Environment variables not working**: Make sure variables are set in the correct service (Railway for backend, Vercel for frontend)

## License

ISC

