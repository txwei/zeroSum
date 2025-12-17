import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/db/mongoose';
import { Group } from '../src/models/Group';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config({ path: '.env' });

const checkGroupMembership = async () => {
  try {
    await connectDB();

    const username = process.argv[2];
    if (!username) {
      console.error('Usage: npm run check-membership <username>');
      process.exit(1);
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      console.error(`User "${username}" not found`);
      process.exit(1);
    }

    console.log(`\nChecking groups for user: ${user.displayName} (${user.username})`);
    console.log(`User ID: ${user._id}\n`);

    // Get all groups
    const allGroups = await Group.find({});
    console.log(`Total groups in database: ${allGroups.length}\n`);

    // Check each group
    for (const group of allGroups) {
      const creatorId = group.createdByUserId.toString();
      const userId = user._id.toString();
      const memberIds = group.memberIds.map((id) => id.toString());

      console.log(`Group: "${group.name}"`);
      console.log(`  Creator ID: ${creatorId}`);
      console.log(`  User ID: ${userId}`);
      console.log(`  Is Creator: ${creatorId === userId}`);
      console.log(`  Member IDs: [${memberIds.join(', ')}]`);
      console.log(`  Is Member: ${memberIds.includes(userId)}`);
      console.log(`  MemberIds includes creator: ${memberIds.includes(creatorId)}`);
      console.log('');
    }

    // Check groups user should belong to
    const userGroups = await Group.find({
      memberIds: new mongoose.Types.ObjectId(user._id),
    });
    console.log(`\nGroups returned by query (memberIds: ${user._id}): ${userGroups.length}`);
    userGroups.forEach((g) => {
      console.log(`  - ${g.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkGroupMembership();

