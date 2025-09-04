// activate-user.js
import sequelize from './config/database.js';
import { User } from './models/index.js';

async function activateUser() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const user = await User.findOne({ where: { email: 'admin@bizflow.gr' } });
    if (user) {
      await user.update({
        role: 'admin',
        status: 'active', 
        emailVerified: true
      });
      
      console.log('User updated successfully:');
      console.log(`- Email: ${user.email}`);
      console.log(`- Name: ${user.name}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- Status: ${user.status}`);
      console.log(`- Verified: ${user.emailVerified}`);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit();
}

activateUser();