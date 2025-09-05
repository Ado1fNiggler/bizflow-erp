// routes/simpleAuth.js
// Ultra simple authentication - no dependencies

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Simple file-based user storage
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(__dirname, '../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load users from file
async function loadUsers() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save users to file
async function saveUsers(users) {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Simple registration
router.post('/simple-register', async (req, res) => {
  try {
    console.log('Simple registration attempt:', req.body);
    
    const { email, password, name } = req.body;
    
    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 3 characters'
      });
    }

    // Load existing users
    const users = await loadUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password, // In real app, this would be hashed
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    console.log('User registered successfully:', newUser.email);

    res.json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

// Simple login
router.post('/simple-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    const users = await loadUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

// List all users (for testing)
router.get('/simple-users', async (req, res) => {
  try {
    const users = await loadUsers();
    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple file-based data endpoints (no authentication for simplicity)
const COMPANIES_FILE = path.join(__dirname, '../data/companies.json');

// Load companies from file
async function loadCompanies() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(COMPANIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save companies to file
async function saveCompanies(companies) {
  await ensureDataDir();
  await fs.writeFile(COMPANIES_FILE, JSON.stringify(companies, null, 2));
}

// GET companies
router.get('/companies', async (req, res) => {
  try {
    const companies = await loadCompanies();
    res.json({
      success: true,
      data: companies,
      pagination: {
        page: 1,
        limit: 20,
        total: companies.length,
        pages: 1
      },
      stats: {
        total: companies.length,
        active: companies.filter(c => c.isActive).length,
        totalBalance: companies.reduce((sum, c) => sum + (c.balance || 0), 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST companies - add new company
router.post('/companies', async (req, res) => {
  try {
    const { name, legalName, afm, doy, email, phone, street, streetNumber, city, postalCode, businessType, industry } = req.body;
    
    // Basic validation
    if (!name || !afm || !email) {
      return res.status(400).json({
        success: false,
        error: 'Όνομα, ΑΦΜ και Email είναι υποχρεωτικά'
      });
    }

    const companies = await loadCompanies();
    
    // Check for duplicate AFM
    if (companies.find(c => c.afm === afm)) {
      return res.status(409).json({
        success: false,
        error: 'Υπάρχει ήδη κατάστημα με αυτόν τον ΑΦΜ'
      });
    }

    const newCompany = {
      id: Date.now().toString(),
      name: name,
      legalName: legalName || name,
      afm: afm,
      doy: doy || '',
      email: email,
      phone: phone || '',
      street: street || '',
      streetNumber: streetNumber || '',
      city: city || '',
      postalCode: postalCode || '',
      businessType: businessType || 'Ατομική',
      industry: industry || 'Εμπόριο',
      isActive: true,
      balance: 0,
      createdAt: new Date().toISOString(),
      settings: {
        invoicePrefix: 'INV',
        currentInvoiceNumber: 1,
        defaultVatRate: 24
      }
    };

    companies.push(newCompany);
    await saveCompanies(companies);

    res.status(201).json({
      success: true,
      data: newCompany
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT companies/:id - update company
router.put('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companies = await loadCompanies();
    const companyIndex = companies.findIndex(c => c.id === id);
    
    if (companyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Δεν βρέθηκε το κατάστημα'
      });
    }

    // Update company
    companies[companyIndex] = {
      ...companies[companyIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await saveCompanies(companies);

    res.json({
      success: true,
      data: companies[companyIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE companies/:id
router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companies = await loadCompanies();
    const filteredCompanies = companies.filter(c => c.id !== id);
    
    if (filteredCompanies.length === companies.length) {
      return res.status(404).json({
        success: false,
        error: 'Δεν βρέθηκε το κατάστημα'
      });
    }

    await saveCompanies(filteredCompanies);

    res.json({
      success: true,
      message: 'Το κατάστημα διαγράφηκε επιτυχώς'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    res.json({
      success: true,
      invoices: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/members', async (req, res) => {
  try {
    res.json({
      success: true,
      members: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;