import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/mongoose';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import gameRoutes from './routes/games';
import transactionRoutes from './routes/transactions';
import statsRoutes from './routes/stats';
import groupRoutes from './routes/groups';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/games', gameRoutes);
app.use('/api', transactionRoutes);
app.use('/api/stats', statsRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

