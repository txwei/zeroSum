import dotenv from 'dotenv';
import { connectDB } from '../src/db/mongoose';
import { User } from '../src/models/User';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env' });

const createUser = async (username: string, displayName: string, password: string) => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      console.error(`❌ User "${username}" already exists!`);
      process.exit(1);
    }

    // Validate password
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username: username.toLowerCase(),
      displayName,
      passwordHash,
    });

    await user.save();

    console.log(`✅ User created successfully!`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   ID: ${user._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
};

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: npm run create-user <username> <displayName> <password>');
  console.error('Example: npm run create-user john "John Doe" mypassword123');
  process.exit(1);
}

const [username, displayName, password] = args;

createUser(username, displayName, password);

