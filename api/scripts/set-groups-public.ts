import dotenv from 'dotenv';
import { connectDB } from '../src/db/mongoose';
import { Group } from '../src/models/Group';

// Load environment variables
dotenv.config({ path: '.env' });

const setGroupsPublic = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Find all groups that don't have isPublic set or are false
    const groups = await Group.find({
      $or: [
        { isPublic: { $exists: false } },
        { isPublic: false },
      ],
    });

    if (groups.length === 0) {
      console.log('✅ No groups need to be updated. All groups are already public.');
      process.exit(0);
    }

    console.log(`📝 Found ${groups.length} group(s) to update...`);

    // Update all groups to be public
    const result = await Group.updateMany(
      {
        $or: [
          { isPublic: { $exists: false } },
          { isPublic: false },
        ],
      },
      {
        $set: { isPublic: true },
      }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} group(s) to public!`);
    console.log(`   Total groups matched: ${result.matchedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting groups to public:', error);
    process.exit(1);
  }
};

setGroupsPublic();

