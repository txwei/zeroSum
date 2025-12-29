import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Game } from './models/Game';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'];
  
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        
        const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
        
        if (isAllowed) {
          callback(null, true);
          return;
        }
        
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });
  
  console.log('Socket.io server initialized');

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Join a room for a specific game
    socket.on('join-game', async (gameToken: string) => {
      socket.join(`game-${gameToken}`);
      console.log(`Client ${socket.id} joined game-${gameToken}`);
      
      // Send current game state to the newly joined client
      try {
        const game = await Game.findOne({ publicToken: gameToken })
          .populate('transactions.userId', 'username displayName')
          .populate('createdByUserId', 'username displayName')
          .populate('groupId', 'name');
        
        if (game) {
          // Send the current state to this newly joined client
          socket.emit('game-updated', game.toJSON());
          console.log(`Sent current game state to newly joined client ${socket.id}`);
        } else {
          console.warn(`Game not found for token: ${gameToken}`);
        }
      } catch (error) {
        console.error('Error fetching game state for new client:', error);
      }
    });

    // Leave a room
    socket.on('leave-game', (gameToken: string) => {
      socket.leave(`game-${gameToken}`);
      console.log(`Client ${socket.id} left game-${gameToken}`);
    });

    // Handle field-level updates (Google Docs style)
    socket.on('field-update', (data: { 
      gameToken: string; 
      rowId: number; 
      field: 'playerName' | 'amount'; 
      value: string | number;
    }) => {
      const { gameToken, rowId, field, value } = data;
      // Broadcast to all other clients in the room (excluding sender)
      socket.to(`game-${gameToken}`).emit('field-updated', { rowId, field, value });
    });

    // Handle game name updates
    socket.on('game-name-update', (data: { gameToken: string; name: string }) => {
      const { gameToken, name } = data;
      socket.to(`game-${gameToken}`).emit('game-name-updated', { name });
    });

    // Handle game date updates
    socket.on('game-date-update', (data: { gameToken: string; date?: string }) => {
      const { gameToken, date } = data;
      socket.to(`game-${gameToken}`).emit('game-date-updated', { date });
    });

    // Handle row add/delete
    socket.on('row-action', (data: {
      gameToken: string;
      action: 'add' | 'delete';
      rowId?: number;
    }) => {
      const { gameToken, action, rowId } = data;
      socket.to(`game-${gameToken}`).emit('row-action-updated', { action, rowId });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', socket.id, error);
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
