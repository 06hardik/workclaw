import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../workclaw.sqlite'),
  logging: false, // Set to true to debug SQL queries
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('📦 SQLite Database connected successfully.');
    
    // Sync models (in production you would use migrations)
    await sequelize.sync({ alter: true });
    console.log('🔄 Database models synchronized.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};
