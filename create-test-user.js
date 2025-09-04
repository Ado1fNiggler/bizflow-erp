// create-test-user.js
import sequelize from './config/database.js';
import { User } from './models/index.js';
import bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    
    const user = await User.create({
      email: 'test@bizflow.gr',
      password: hashedPassword,
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      emailVerified: true
    });
    
    console.log('Test user created successfully:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Status: ${user.status}`);
    
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('User already exists');
    } else {
      console.error('Error:', error.message);
    }
  }
  
  process.exit();
}

createTestUser();