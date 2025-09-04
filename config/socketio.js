// config/socketio.js
// Socket.io configuration for real-time features

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redisPublisher, redisSubscriber } from './redis.js';
import { logger } from '../middleware/logger.js';
import User from '../models/User.js';

let io;

// Initialize Socket.io
export const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    },
    
    // Connection options
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB
    
    // Transport options
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    
    // Adapter for Redis
    adapter: createAdapter(redisPublisher, redisSubscriber)
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'username', 'email', 'role', 'isActive']
      });

      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`User ${socket.user.username} connected via socket ${socket.id}`);
    
    // Join user's personal room
    socket.join(`user:${socket.userId}`);
    
    // Join role-based rooms
    socket.join(`role:${socket.user.role}`);
    
    // Track online users
    trackUserStatus(socket.userId, true);

    // ======================
    // Event Handlers
    // ======================

    // Join specific rooms
    socket.on('join:company', async (companyId) => {
      try {
        // Verify user has access to company
        const hasAccess = await verifyCompanyAccess(socket.userId, companyId);
        if (hasAccess) {
          socket.join(`company:${companyId}`);
          socket.emit('joined:company', { companyId });
        } else {
          socket.emit('error', { message: 'Access denied to company' });
        }
      } catch (error) {
        logger.error('Join company error:', error);
        socket.emit('error', { message: 'Failed to join company room' });
      }
    });

    // Document events
    socket.on('document:viewing', (documentId) => {
      socket.join(`document:${documentId}`);
      socket.to(`document:${documentId}`).emit('document:viewer:joined', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('document:editing', (documentId) => {
      socket.to(`document:${documentId}`).emit('document:editor:active', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('document:stopEditing', (documentId) => {
      socket.to(`document:${documentId}`).emit('document:editor:inactive', {
        userId: socket.userId
      });
    });

    // Real-time notifications
    socket.on('notification:mark-read', async (notificationId) => {
      try {
        // Mark notification as read in database
        await markNotificationRead(notificationId, socket.userId);
        socket.emit('notification:marked-read', { notificationId });
      } catch (error) {
        logger.error('Mark notification error:', error);
      }
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      socket.to(data.room).emit('typing:user:start', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(data.room).emit('typing:user:stop', {
        userId: socket.userId
      });
    });

    // Custom events
    socket.on('report:generate', async (reportData) => {
      try {
        socket.emit('report:progress', { status: 'started', progress: 0 });
        // Report generation logic would go here
        // Emit progress updates as needed
      } catch (error) {
        socket.emit('report:error', { message: error.message });
      }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info(`User ${socket.user.username} disconnected: ${reason}`);
      trackUserStatus(socket.userId, false);
      
      // Notify rooms about user leaving
      io.emit('user:offline', { userId: socket.userId });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.user.username}:`, error);
    });
  });

  // Periodic cleanup
  setInterval(() => {
    io.emit('ping', { timestamp: Date.now() });
  }, 30000);

  logger.info('Socket.io server initialized');
  return io;
};

// ======================
// Utility Functions
// ======================

// Track user online status
const onlineUsers = new Map();

function trackUserStatus(userId, isOnline) {
  if (isOnline) {
    onlineUsers.set(userId, {
      timestamp: Date.now(),
      socketCount: (onlineUsers.get(userId)?.socketCount || 0) + 1
    });
  } else {
    const user = onlineUsers.get(userId);
    if (user && user.socketCount > 1) {
      user.socketCount--;
    } else {
      onlineUsers.delete(userId);
    }
  }
}

// Get online users
export function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

// Check if user is online
export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

// Emit to specific user
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

// Emit to role
export function emitToRole(role, event, data) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
}

// Emit to company
export function emitToCompany(companyId, event, data) {
  if (!io) return;
  io.to(`company:${companyId}`).emit(event, data);
}

// Broadcast to all
export function broadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
}

// ======================
// Event Emitters
// ======================

// Notify new document
export function notifyNewDocument(document, companyId) {
  emitToCompany(companyId, 'document:new', {
    id: document.id,
    type: document.type,
    number: document.number,
    companyId: document.companyId,
    amount: document.totalAmount,
    createdBy: document.createdById,
    createdAt: document.createdAt
  });
}

// Notify document update
export function notifyDocumentUpdate(documentId, changes, userId) {
  if (!io) return;
  io.to(`document:${documentId}`).emit('document:updated', {
    documentId,
    changes,
    updatedBy: userId,
    timestamp: Date.now()
  });
}

// Notify payment received
export function notifyPaymentReceived(payment) {
  emitToRole('accountant', 'payment:received', payment);
  emitToUser(payment.userId, 'payment:confirmed', payment);
}

// Notify report ready
export function notifyReportReady(reportId, userId) {
  emitToUser(userId, 'report:ready', {
    reportId,
    message: 'Η αναφορά σας είναι έτοιμη',
    timestamp: Date.now()
  });
}

// System announcement
export function systemAnnouncement(message, level = 'info') {
  broadcast('system:announcement', {
    message,
    level,
    timestamp: Date.now()
  });
}

// ======================
// Helper Functions
// ======================

async function verifyCompanyAccess(userId, companyId) {
  // Implement access verification logic
  // Check if user has permission to access company data
  return true; // Placeholder
}

async function markNotificationRead(notificationId, userId) {
  // Implement notification marking logic
  // Update notification status in database
  return true; // Placeholder
}

// Graceful shutdown
export function closeSocketIO() {
  if (io) {
    io.close(() => {
      logger.info('Socket.io server closed');
    });
  }
}

export default io;