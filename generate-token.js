// generate-token.js
import sequelize from './config/database.js';
import { User } from './models/index.js';
import jwt from 'jsonwebtoken';

async function generateToken() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const user = await User.findOne({ where: { email: 'test@bizflow.gr' } });
    
    if (user) {
      // Generate JWT token
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production', {
        expiresIn: '24h'
      });
      
      console.log('JWT Token for', user.email + ':');
      console.log(token);
      console.log('\\nYou can use this token in the Authorization header as:');
      console.log('Authorization: Bearer ' + token);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit();
}

generateToken();