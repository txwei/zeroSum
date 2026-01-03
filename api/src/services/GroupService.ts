import mongoose from 'mongoose';
import { GroupRepository } from '../repositories/GroupRepository';
import { UserRepository } from '../repositories/UserRepository';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../types/errors';
import { validateString, validateObjectId } from '../utils/validators';
import { logger } from '../utils/logger';
import { groupToDTO, GroupDTO } from '../types/dto';
import { isGroupMember, isGroupAdmin } from '../middleware/groupAuth';
import { isSuperUser } from '../utils/superUser';
import { AuthRequest } from '../middleware/auth';

export class GroupService {
  private groupRepository: GroupRepository;
  private userRepository: UserRepository;

  constructor() {
    this.groupRepository = new GroupRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new group
   */
  async createGroup(
    userId: string,
    name: string,
    description?: string,
    isPublic: boolean = true
  ): Promise<GroupDTO> {
    validateString(name, 'Group name', 1);

    const group = await this.groupRepository.create({
      name: name.trim(),
      description: description?.trim(),
      createdByUserId: new mongoose.Types.ObjectId(userId),
      memberIds: [new mongoose.Types.ObjectId(userId)],
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
    });

    logger.info('Group created', { groupId: group._id, name: group.name, createdBy: userId });

    return groupToDTO(group);
  }

  /**
   * Get group by ID (with access control)
   */
  async getGroupById(groupId: string, userId: string | null = null): Promise<GroupDTO> {
    validateObjectId(groupId, 'Group ID');

    const group = await this.groupRepository.findById(groupId);

    // Check access: public groups accessible to everyone, private groups require membership
    if (!group.isPublic) {
      if (!userId) {
        throw new ForbiddenError('Authentication required for private groups');
      }
      if (!isGroupMember(group, userId)) {
        throw new ForbiddenError('Not a member of this group');
      }
    }

    const populatedGroup = await this.groupRepository.findByIdPopulated(groupId);
    return groupToDTO(populatedGroup);
  }

  /**
   * List accessible groups
   */
  async listGroups(userId: string | null = null): Promise<GroupDTO[]> {
    const groups = await this.groupRepository.findAccessibleGroups(userId);
    return groups.map(groupToDTO);
  }

  /**
   * Update group
   */
  async updateGroup(
    groupId: string,
    userId: string,
    updates: { name?: string; description?: string; isPublic?: boolean },
    req?: AuthRequest
  ): Promise<GroupDTO> {
    validateObjectId(groupId, 'Group ID');

    const group = await this.groupRepository.findById(groupId);

    // Check if user is admin or super user
    if (!isGroupAdmin(group, userId) && (!req || !isSuperUser(req))) {
      throw new ForbiddenError('Only admin can update the group');
    }

    const updateData: any = {};

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new ValidationError('Group name cannot be empty');
      }
      updateData.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim();
    }

    if (updates.isPublic !== undefined) {
      updateData.isPublic = Boolean(updates.isPublic);
    }

    const updatedGroup = await this.groupRepository.update(groupId, updateData);

    logger.info('Group updated', { groupId, updatedBy: userId });

    return groupToDTO(updatedGroup);
  }

  /**
   * Add member to group
   */
  async addMember(groupId: string, userId: string, username: string, req?: AuthRequest): Promise<GroupDTO> {
    validateObjectId(groupId, 'Group ID');

    const group = await this.groupRepository.findById(groupId);

    // Check if requester is a member (super user can add members to any group)
    if (!isGroupMember(group, userId) && (!req || !isSuperUser(req))) {
      throw new ForbiddenError('Not a member of this group');
    }

    // Find user to add
    const userToAdd = await this.userRepository.findByUsername(username);
    if (!userToAdd) {
      throw new NotFoundError('User');
    }

    // Check if user is already a member
    if (isGroupMember(group, userToAdd._id.toString())) {
      throw new ConflictError('User is already a member of this group');
    }

    const updatedGroup = await this.groupRepository.addMember(
      groupId,
      userToAdd._id
    );

    logger.info('Member added to group', { groupId, userId: userToAdd._id, addedBy: userId });

    return groupToDTO(updatedGroup);
  }

  /**
   * Remove member from group
   */
  async removeMember(
    groupId: string,
    adminUserId: string,
    memberUserId: string,
    req?: AuthRequest
  ): Promise<GroupDTO> {
    validateObjectId(groupId, 'Group ID');
    validateObjectId(memberUserId, 'User ID');

    const group = await this.groupRepository.findById(groupId);

    // Check if requester is admin or super user
    if (!isGroupAdmin(group, adminUserId) && (!req || !isSuperUser(req))) {
      throw new ForbiddenError('Only admin can remove members');
    }

    // Don't allow removing the admin
    if (memberUserId === group.createdByUserId.toString() && (!req || !isSuperUser(req))) {
      throw new ValidationError('Cannot remove the group admin');
    }

    const updatedGroup = await this.groupRepository.removeMember(groupId, memberUserId);

    logger.info('Member removed from group', { groupId, userId: memberUserId, removedBy: adminUserId });

    return groupToDTO(updatedGroup);
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId: string, userId: string, req?: AuthRequest): Promise<void> {
    validateObjectId(groupId, 'Group ID');

    const group = await this.groupRepository.findById(groupId);

    // Check if user is admin or super user
    if (!isGroupAdmin(group, userId) && (!req || !isSuperUser(req))) {
      throw new ForbiddenError('Only admin can delete the group');
    }

    await this.groupRepository.delete(groupId);

    logger.info('Group deleted', { groupId, deletedBy: userId });
  }

  /**
   * Get accessible group IDs for a user
   */
  async getAccessibleGroupIds(userId: string | null): Promise<mongoose.Types.ObjectId[]> {
    return this.groupRepository.getAccessibleGroupIds(userId);
  }

  /**
   * Check if user is member of group
   */
  isMember(group: any, userId: string): boolean {
    return isGroupMember(group, userId);
  }

  /**
   * Check if user is admin of group
   */
  isAdmin(group: any, userId: string): boolean {
    return isGroupAdmin(group, userId);
  }

  /**
   * Get group repository (for use by other services)
   * This is a public method to allow other services to access repository methods
   * while maintaining proper encapsulation
   */
  getRepository(): GroupRepository {
    return this.groupRepository;
  }
}

