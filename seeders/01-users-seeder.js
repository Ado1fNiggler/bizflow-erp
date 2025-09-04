// seeders/01-users-seeder.js
// Seeder for initial users data

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const up = async (queryInterface, Sequelize) => {
  // Generate password hash
  const defaultPassword = await bcrypt.hash('Admin@123', 10);
  const userPassword = await bcrypt.hash('User@123', 10);
  
  // Generate UUIDs for consistent references
  const adminId = uuidv4();
  const managerId = uuidv4();
  const accountantId = uuidv4();
  const userId = uuidv4();
  const viewerId = uuidv4();
  
  const users = [
    {
      id: adminId,
      email: 'admin@bizflow.gr',
      username: 'admin',
      password: defaultPassword,
      first_name: 'System',
      last_name: 'Administrator',
      phone: '2310555001',
      mobile: '6945555001',
      role: 'admin',
      permissions: JSON.stringify([
        'users.create',
        'users.read',
        'users.update',
        'users.delete',
        'companies.create',
        'companies.read',
        'companies.update',
        'companies.delete',
        'members.create',
        'members.read',
        'members.update',
        'members.delete',
        'documents.create',
        'documents.read',
        'documents.update',
        'documents.delete',
        'reports.view',
        'reports.export',
        'settings.manage',
        'backup.manage'
      ]),
      language: 'el',
      timezone: 'Europe/Athens',
      date_format: 'DD/MM/YYYY',
      email_verified: true,
      is_active: true,
      settings: JSON.stringify({
        theme: 'light',
        notifications: true,
        sidebar: 'expanded',
        itemsPerPage: 20
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: managerId,
      email: 'manager@bizflow.gr',
      username: 'manager',
      password: userPassword,
      first_name: 'Γιώργος',
      last_name: 'Παπαδόπουλος',
      phone: '2310555002',
      mobile: '6945555002',
      role: 'manager',
      permissions: JSON.stringify([
        'companies.create',
        'companies.read',
        'companies.update',
        'members.create',
        'members.read',
        'members.update',
        'documents.create',
        'documents.read',
        'documents.update',
        'reports.view',
        'reports.export'
      ]),
      language: 'el',
      timezone: 'Europe/Athens',
      date_format: 'DD/MM/YYYY',
      email_verified: true,
      is_active: true,
      settings: JSON.stringify({
        theme: 'light',
        notifications: true,
        sidebar: 'expanded',
        itemsPerPage: 20
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: accountantId,
      email: 'accountant@bizflow.gr',
      username: 'accountant',
      password: userPassword,
      first_name: 'Μαρία',
      last_name: 'Παπαδοπούλου',
      phone: '2310555003',
      mobile: '6945555003',
      role: 'accountant',
      permissions: JSON.stringify([
        'companies.read',
        'members.read',
        'documents.create',
        'documents.read',
        'documents.update',
        'reports.view',
        'reports.export'
      ]),
      language: 'el',
      timezone: 'Europe/Athens',
      date_format: 'DD/MM/YYYY',
      email_verified: true,
      is_active: true,
      settings: JSON.stringify({
        theme: 'light',
        notifications: true,
        sidebar: 'collapsed',
        itemsPerPage: 25
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: userId,
      email: 'user@bizflow.gr',
      username: 'user',
      password: userPassword,
      first_name: 'Νίκος',
      last_name: 'Νικολάου',
      phone: '2310555004',
      mobile: '6945555004',
      role: 'user',
      permissions: JSON.stringify([
        'companies.read',
        'members.read',
        'documents.read',
        'reports.view'
      ]),
      language: 'el',
      timezone: 'Europe/Athens',
      date_format: 'DD/MM/YYYY',
      email_verified: true,
      is_active: true,
      settings: JSON.stringify({
        theme: 'light',
        notifications: false,
        sidebar: 'collapsed',
        itemsPerPage: 10
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: viewerId,
      email: 'viewer@bizflow.gr',
      username: 'viewer',
      password: userPassword,
      first_name: 'Ελένη',
      last_name: 'Ελενίδου',
      phone: '2310555005',
      mobile: '6945555005',
      role: 'viewer',
      permissions: JSON.stringify([
        'companies.read',
        'members.read',
        'documents.read'
      ]),
      language: 'el',
      timezone: 'Europe/Athens',
      date_format: 'DD/MM/YYYY',
      email_verified: true,
      is_active: true,
      settings: JSON.stringify({
        theme: 'light',
        notifications: false,
        sidebar: 'collapsed',
        itemsPerPage: 10
      }),
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  // Additional demo users
  const demoUsers = [
    {
      id: uuidv4(),
      email: 'demo@bizflow.gr',
      username: 'demo',
      password: userPassword,
      first_name: 'Demo',
      last_name: 'User',
      phone: '2310555006',
      mobile: '6945555006',
      role: 'user',
      permissions: JSON.stringify(['companies.read', 'documents.read']),
      language: 'el',
      timezone: 'Europe/Athens',
      date_format: 'DD/MM/YYYY',
      email_verified: false,
      is_active: true,
      settings: JSON.stringify({
        theme: 'dark',
        notifications: true,
        sidebar: 'expanded',
        itemsPerPage: 15
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'test@bizflow.gr',
      username: 'testuser',
      password: userPassword,
      first_name: 'Test',
      last_name: 'Account',
      phone: '2310555007',
      mobile: '6945555007',
      role: 'user',
      permissions: JSON.stringify(['companies.read', 'members.read']),
      language: 'en',
      timezone: 'Europe/Athens',
      date_format: 'MM/DD/YYYY',
      email_verified: true,
      is_active: false,
      deactivated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      deactivation_reason: 'Test account deactivated',
      settings: JSON.stringify({
        theme: 'light',
        notifications: false,
        sidebar: 'collapsed',
        itemsPerPage: 20
      }),
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      updated_at: new Date()
    }
  ];
  
  // Insert all users
  await queryInterface.bulkInsert('users', [...users, ...demoUsers], {});
  
  console.log('✅ Users seeded successfully');
  console.log('📧 Default credentials:');
  console.log('   Admin: admin@bizflow.gr / Admin@123');
  console.log('   Manager: manager@bizflow.gr / User@123');
  console.log('   Accountant: accountant@bizflow.gr / User@123');
  console.log('   User: user@bizflow.gr / User@123');
  console.log('   Viewer: viewer@bizflow.gr / User@123');
  console.log('   Demo: demo@bizflow.gr / User@123');
};

export const down = async (queryInterface, Sequelize) => {
  // Remove all seeded users
  await queryInterface.bulkDelete('users', {
    email: {
      [Sequelize.Op.in]: [
        'admin@bizflow.gr',
        'manager@bizflow.gr',
        'accountant@bizflow.gr',
        'user@bizflow.gr',
        'viewer@bizflow.gr',
        'demo@bizflow.gr',
        'test@bizflow.gr'
      ]
    }
  }, {});
};