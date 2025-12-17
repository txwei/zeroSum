import dotenv from 'dotenv';
import { connectDB } from '../src/db/mongoose';
import { Group } from '../src/models/Group';
import '../src/models/User'; // Import to register the model

// Load environment variables
dotenv.config({ path: '.env' });

const fixGroupMembership = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('Fixing group memberships...');

    // Get all groups
    const groups = await Group.find({});

    for (const group of groups) {
      const creatorId = group.createdByUserId.toString();
      
      // Check if creator is in memberIds
      const isMember = group.memberIds.some(
        (memberId) => memberId.toString() === creatorId
      );

      if (!isMember) {
        console.log(`Adding creator ${creatorId} to group ${group.name}...`);
        group.memberIds.push(group.createdByUserId);
        await group.save();
        console.log(`✅ Fixed group: ${group.name}`);
      } else {
        console.log(`✓ Group ${group.name} already has creator as member`);
      }
    }

    console.log('✅ All group memberships fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing memberships:', error);
    process.exit(1);
  }
};

fixGroupMembership();

