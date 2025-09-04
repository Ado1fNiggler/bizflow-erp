// fix-password.js
import sequelize from './config/database.js';
import { User } from './models/index.js';
import bcrypt from 'bcrypt';

async function fixPassword() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const user = await User.findOne({ where: { email: 'admin@bizflow.gr' } });
    if (user) {
      // Hash the password properly
      const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
      
      await user.update({
        password: hashedPassword,
        loginAttempts: 0,  // Reset login attempts
        lockedUntil: null   // Remove any locks
      });
      
      console.log('Password updated and login attempts reset for:', user.email);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit();
}

fixPassword();