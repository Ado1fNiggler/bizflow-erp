// check-users.js
import sequelize from './config/database.js';
import { User } from './models/index.js';

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const users = await User.findAll({
      attributes: ['id', 'email', 'name', 'role', 'status', 'emailVerified']
    });
    
    console.log('Found users:', users.length);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Role: ${user.role}, Status: ${user.status}, Verified: ${user.emailVerified}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit();
}

checkUsers();