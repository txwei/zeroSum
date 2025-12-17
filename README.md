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
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### API Setup

1. Navigate to the api directory:
   ```bash
   cd api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the api directory:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/zerosum
   JWT_SECRET=your-secret-key-here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Web Setup

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

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

## License

ISC

