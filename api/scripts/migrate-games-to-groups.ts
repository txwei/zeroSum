import dotenv from 'dotenv';
import { connectDB } from '../src/db/mongoose';
import { Game } from '../src/models/Game';
import { Group } from '../src/models/Group';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config({ path: '.env' });

const migrateGamesToGroups = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('Starting migration...');

    // Get all games without groupId
    const gamesWithoutGroup = await Game.find({ groupId: { $exists: false } });

    if (gamesWithoutGroup.length === 0) {
      console.log('No games need migration. All games already have groups.');
      process.exit(0);
    }

    console.log(`Found ${gamesWithoutGroup.length} games without groups.`);

    // Get all unique creators
    const creatorIds = [...new Set(gamesWithoutGroup.map((g) => g.createdByUserId.toString()))];

    // Create a default group for each creator
    const groupMap = new Map<string, string>(); // creatorId -> groupId

    for (const creatorId of creatorIds) {
      const creator = await User.findById(creatorId);
      if (!creator) {
        console.warn(`Creator ${creatorId} not found, skipping...`);
        continue;
      }

      // Check if default group already exists
      let defaultGroup = await Group.findOne({
        name: `${creator.displayName}'s Games`,
        createdByUserId: creatorId,
      });

      if (!defaultGroup) {
        defaultGroup = new Group({
          name: `${creator.displayName}'s Games`,
          description: 'Default group for existing games',
          createdByUserId: creatorId,
          memberIds: [creatorId],
        });
        await defaultGroup.save();
        console.log(`Created default group for ${creator.displayName}`);
      }

      groupMap.set(creatorId, defaultGroup._id.toString());
    }

    // Update all games to belong to their creator's default group
    let updated = 0;
    for (const game of gamesWithoutGroup) {
      const creatorId = game.createdByUserId.toString();
      const groupId = groupMap.get(creatorId);

      if (groupId) {
        game.groupId = groupId as any;
        await game.save();
        updated++;
      }
    }

    console.log(`✅ Migration complete! Updated ${updated} games.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateGamesToGroups();

