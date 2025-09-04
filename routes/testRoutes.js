// routes/testRoutes.js
// Test routes without rate limiting for development

import express from 'express';
import jwt from 'jsonwebtoken';
import { User, Company } from '../models/index.js';

const router = express.Router();

// Test endpoint - no auth required
router.get('/ping', (req, res) => {
  res.json({
    message: 'Pong! Server is working',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Test database connection
router.get('/db', async (req, res) => {
  try {
    const userCount = await User.count();
    const companyCount = await Company.count();
    
    res.json({
      status: 'Database OK',
      users: userCount,
      companies: companyCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});

// Test auth - simplified login without rate limiting
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Login error',
      message: error.message
    });
  }
});

export default router;