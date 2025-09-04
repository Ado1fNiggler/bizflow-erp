import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware για έλεγχο authentication
export const authenticate = async (req, res, next) => {
  try {
    // Παίρνουμε το token από το header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    // Επαληθεύουμε το token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Βρίσκουμε τον χρήστη (PostgreSQL με Sequelize)
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      throw new Error();
    }

    // Προσθέτουμε τον χρήστη στο request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Παρακαλώ συνδεθείτε' });
  }
};

// Middleware για έλεγχο ρόλων
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Δεν έχετε δικαίωμα πρόσβασης' });
    }

    next();
  };
};

// Alternative name for role checking
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Middleware για έλεγχο ιδιοκτησίας εταιρείας
export const checkCompanyOwnership = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.body.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Απαιτείται ID εταιρείας' });
    }

    // Έλεγχος αν ο χρήστης είναι admin ή ιδιοκτήτης της εταιρείας
    if (req.user.role === 'admin' || 
        (req.user.companyId && req.user.companyId === companyId)) {
      next();
    } else {
      res.status(403).json({ error: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτήν την εταιρεία' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Σφάλμα ελέγχου δικαιωμάτων' });
  }
};

export default {
  authenticate,
  authorize,
  checkCompanyOwnership
};