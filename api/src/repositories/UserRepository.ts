import { User, IUser } from '../models/User';
import { NotFoundError, ConflictError } from '../types/errors';
import { normalizeUsername } from '../utils/helpers';

export class UserRepository {
  async findById(id: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username: normalizeUsername(username) });
  }

  async findAll(): Promise<IUser[]> {
    return User.find({}).select('username displayName').sort({ displayName: 1 });
  }

  async searchUsers(query: string, limit: number = 10): Promise<IUser[]> {
    const searchRegex = new RegExp(query, 'i');
    return User.find({
      $or: [
        { displayName: searchRegex },
        { username: searchRegex },
      ],
    })
      .select('username displayName')
      .limit(limit);
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    // Check if user already exists
    if (userData.username) {
      const existingUser = await this.findByUsername(userData.username);
      if (existingUser) {
        throw new ConflictError('Username already exists');
      }
    }

    const user = new User({
      ...userData,
      username: userData.username ? normalizeUsername(userData.username) : undefined,
    });
    
    await user.save();
    return user;
  }

  async update(id: string, updates: Partial<IUser>): Promise<IUser> {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async save(user: IUser): Promise<IUser> {
    await user.save();
    return user;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await User.countDocuments({ username: normalizeUsername(username) });
    return count > 0;
  }
}


