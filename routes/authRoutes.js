// routes/authRoutes.js
// Authentication and authorization routes

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import auditService from '../services/auditService.js';
import emailService from '../services/emailService.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import crypto from 'crypto';

const router = express.Router();

// ======================
// Validation Rules
// ======================

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 })
];

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  }),
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
];

const resetPasswordValidation = [
  body('password').isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  }),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
];

// ======================
// Public Routes
// ======================

// POST /api/auth/login
router.post('/login', rateLimiter('login'), loginValidation, async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, rememberMe } = req.body;

    // Find user
    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'email', 'password', 'name', 'role', 'status', 'loginAttempts', 'lockedUntil']
    });

    // Check if user exists
    if (!user) {
      await auditService.log({
        action: 'login',
        status: 'failure',
        category: 'auth',
        description: 'Login attempt with non-existent email',
        metadata: { email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await auditService.logSecurityEvent('ACCOUNT_LOCKED_ACCESS', 'medium', {
        userId: user.id,
        email: user.email,
        lockedUntil: user.lockedUntil
      });

      return res.status(423).json({
        error: 'Account is locked. Please try again later.',
        lockedUntil: user.lockedUntil
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await auditService.logSecurityEvent('ACCOUNT_LOCKED', 'high', {
          userId: user.id,
          email: user.email,
          attempts: user.loginAttempts
        });
      }
      
      await user.save();

      await auditService.log({
        action: 'login',
        status: 'failure',
        category: 'auth',
        userId: user.id,
        description: 'Invalid password',
        metadata: { attempts: user.loginAttempts },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        remainingAttempts: Math.max(0, 5 - user.loginAttempts)
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account is not active'
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    // Generate tokens
    const tokenExpiry = rememberMe ? '30d' : '24h';
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '90d' }
    );

    // Store refresh token
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdByIp: req.ip
    });

    // Audit log
    await auditService.log({
      action: 'login',
      status: 'success',
      category: 'auth',
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      description: 'Successful login',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', rateLimiter('auth'), registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      status: 'pending'
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await user.update({
      verificationToken,
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Send verification email
    await emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken
    });

    // Audit log
    await auditService.log({
      action: 'create',
      status: 'success',
      category: 'auth',
      entityType: 'User',
      entityId: user.id,
      description: 'New user registration',
      metadata: { email, name },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user and check token
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if refresh token exists in database
    const storedToken = await RefreshToken.findOne({
      where: { 
        token: refreshToken,
        userId: user.id,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      accessToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Remove refresh token from database
    if (refreshToken) {
      const tokenToRevoke = await RefreshToken.findOne({
        where: { token: refreshToken, userId: req.user.id }
      });
      
      if (tokenToRevoke) {
        await tokenToRevoke.update({
          isRevoked: true,
          revokedAt: new Date(),
          revokedByIp: req.ip
        });
      }
    }

    // Audit log
    await auditService.log({
      action: 'logout',
      status: 'success',
      category: 'auth',
      userId: req.user.id,
      userName: req.user.name,
      description: 'User logout',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', rateLimiter('passwordReset'), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    await user.update({
      resetToken,
      resetExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });

    // Send reset email
    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: resetToken
    });

    // Audit log
    await auditService.log({
      action: 'password_reset_request',
      status: 'success',
      category: 'auth',
      userId: user.id,
      description: 'Password reset requested',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    await user.update({
      password: hashedPassword,
      resetToken: null,
      resetExpires: null,
      passwordChangedAt: new Date()
    });

    // Audit log
    await auditService.logSecurityEvent('PASSWORD_RESET', 'medium', {
      userId: user.id,
      email: user.email
    });

    // Send confirmation email
    await emailService.sendPasswordChangedEmail({
      to: user.email,
      name: user.name
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      where: {
        verificationToken: token,
        verificationExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired verification token'
      });
    }

    await user.update({
      status: 'active',
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null
    });

    // Audit log
    await auditService.log({
      action: 'email_verification',
      status: 'success',
      category: 'auth',
      userId: user.id,
      description: 'Email verified successfully'
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Protected Routes
// ======================

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'name', 'role', 'status', 'createdAt', 'lastLoginAt']
    });

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({
      password: hashedPassword,
      passwordChangedAt: new Date()
    });

    // Audit log
    await auditService.logSecurityEvent('PASSWORD_CHANGED', 'medium', {
      userId: user.id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;