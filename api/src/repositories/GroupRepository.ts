import mongoose from 'mongoose';
import { Group, IGroup } from '../models/Group';
import { NotFoundError } from '../types/errors';

export class GroupRepository {
  async findById(id: string): Promise<IGroup> {
    const group = await Group.findById(id);
    if (!group) {
      throw new NotFoundError('Group');
    }
    return group;
  }

  async findByIdPopulated(id: string): Promise<IGroup> {
    const group = await Group.findById(id)
      .populate('createdByUserId', 'username displayName')
      .populate('memberIds', 'username displayName');
    
    if (!group) {
      throw new NotFoundError('Group');
    }
    
    return group;
  }

  async findPublicGroups(): Promise<IGroup[]> {
    return Group.find({ isPublic: true })
      .populate('createdByUserId', 'username displayName')
      .populate('memberIds', 'username displayName')
      .sort({ createdAt: -1 });
  }

  async findUserGroups(userId: string): Promise<IGroup[]> {
    return Group.find({
      memberIds: new mongoose.Types.ObjectId(userId),
    })
      .populate('createdByUserId', 'username displayName')
      .populate('memberIds', 'username displayName')
      .sort({ createdAt: -1 });
  }

  async findAccessibleGroups(userId: string | null): Promise<IGroup[]> {
    if (userId) {
      const publicGroups = await Group.find({ isPublic: true })
        .populate('createdByUserId', 'username displayName')
        .populate('memberIds', 'username displayName')
        .sort({ createdAt: -1 });
      
      const userGroups = await Group.find({
        memberIds: new mongoose.Types.ObjectId(userId),
      })
        .populate('createdByUserId', 'username displayName')
        .populate('memberIds', 'username displayName')
        .sort({ createdAt: -1 });
      
      // Combine and deduplicate
      const allGroups = [...publicGroups, ...userGroups];
      const uniqueGroups = Array.from(
        new Map(allGroups.map(g => [g._id.toString(), g])).values()
      );
      
      return uniqueGroups;
    } else {
      return this.findPublicGroups();
    }
  }

  async getAccessibleGroupIds(userId: string | null): Promise<mongoose.Types.ObjectId[]> {
    if (userId) {
      const publicGroups = await Group.find({ isPublic: true }).select('_id');
      const userGroups = await Group.find({
        memberIds: new mongoose.Types.ObjectId(userId),
      }).select('_id');
      
      const allGroupIds = [
        ...publicGroups.map(g => g._id),
        ...userGroups.map(g => g._id),
      ];
      
      return Array.from(new Set(allGroupIds.map(id => id.toString())))
        .map(id => new mongoose.Types.ObjectId(id));
    } else {
      const publicGroups = await Group.find({ isPublic: true }).select('_id');
      return publicGroups.map(g => g._id);
    }
  }

  async create(groupData: Partial<IGroup>): Promise<IGroup> {
    const group = new Group(groupData);
    await group.save();
    await group.populate('createdByUserId', 'username displayName');
    await group.populate('memberIds', 'username displayName');
    return group;
  }

  async update(id: string, updates: Partial<IGroup>): Promise<IGroup> {
    const group = await Group.findByIdAndUpdate(id, updates, { new: true })
      .populate('createdByUserId', 'username displayName')
      .populate('memberIds', 'username displayName');
    
    if (!group) {
      throw new NotFoundError('Group');
    }
    
    return group;
  }

  async save(group: IGroup): Promise<IGroup> {
    await group.save();
    await group.populate('createdByUserId', 'username displayName');
    await group.populate('memberIds', 'username displayName');
    return group;
  }

  async delete(id: string): Promise<void> {
    const result = await Group.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundError('Group');
    }
  }

  async addMember(groupId: string, userId: mongoose.Types.ObjectId): Promise<IGroup> {
    const group = await this.findById(groupId);
    
    if (!group.memberIds.some(id => id.toString() === userId.toString())) {
      group.memberIds.push(userId);
      return this.save(group);
    }
    
    return this.findByIdPopulated(groupId);
  }

  async removeMember(groupId: string, userId: string): Promise<IGroup> {
    const group = await this.findById(groupId);
    const memberIndex = group.memberIds.findIndex(
      (memberId) => memberId.toString() === userId
    );
    
    if (memberIndex === -1) {
      throw new NotFoundError('Member');
    }
    
    group.memberIds.splice(memberIndex, 1);
    return this.save(group);
  }
}


