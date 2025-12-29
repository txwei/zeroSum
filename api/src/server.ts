import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose, { connectDB } from './db/mongoose';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import gameRoutes from './routes/games';
import transactionRoutes from './routes/transactions';
import statsRoutes from './routes/stats';
import groupRoutes from './routes/groups';
import { initializeSocket } from './socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Database connection check middleware (except for health check)
app.use((req, res, next) => {
  // Allow health check without DB connection
  if (req.path === '/api/health') {
    return next();
  }
  
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    console.error('Database not connected. ReadyState:', mongoose.connection.readyState);
    return res.status(503).json({ 
      error: 'Database connection not available',
      readyState: mongoose.connection.readyState 
    });
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/games', gameRoutes);
app.use('/api', transactionRoutes);
app.use('/api/stats', statsRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    database: dbStatus,
    readyState: mongoose.connection.readyState
  });
});

// Start server after database connection
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Initialize Socket.io BEFORE starting the server
    initializeSocket(httpServer);
    console.log('Socket.io initialized');
    
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 MongoDB connection state: ${mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'}`);
      console.log(`🔌 Socket.io is ready to accept connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

