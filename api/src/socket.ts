import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a room for a specific game
    socket.on('join-game', (gameToken: string) => {
      socket.join(`game-${gameToken}`);
      console.log(`Client ${socket.id} joined game-${gameToken}`);
    });

    // Leave a room
    socket.on('leave-game', (gameToken: string) => {
      socket.leave(`game-${gameToken}`);
      console.log(`Client ${socket.id} left game-${gameToken}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

// Helper function to emit game updates to all clients in a game room
export const emitGameUpdate = (gameToken: string, gameData: any) => {
  if (io) {
    io.to(`game-${gameToken}`).emit('game-updated', gameData);
    console.log(`Emitted game-updated to game-${gameToken}`);
  }
};

