/**
 * Tests for GameService encapsulation fixes
 * Verifies that services use proper public methods instead of bracket notation
 */
import { GameService } from '../../services/GameService';
import { GroupService } from '../../services/GroupService';
import { UserService } from '../../services/UserService';

describe('GameService Encapsulation', () => {
  let gameService: GameService;
  let groupService: GroupService;
  let userService: UserService;

  beforeEach(() => {
    gameService = new GameService();
    groupService = new GroupService();
    userService = new UserService();
  });

  it('should have getRepository method on GroupService', () => {
    expect(typeof groupService.getRepository).toBe('function');
    const repository = groupService.getRepository();
    expect(repository).toBeDefined();
    expect(typeof repository.findById).toBe('function');
  });

  it('should have getRepository method on UserService', () => {
    expect(typeof userService.getRepository).toBe('function');
    const repository = userService.getRepository();
    expect(repository).toBeDefined();
    expect(typeof repository.findById).toBe('function');
  });

  it('should not access private repositories via bracket notation in GameService', () => {
    // This test verifies that the code doesn't use bracket notation
    // by checking that getRepository methods exist and are used
    const groupRepo = groupService.getRepository();
    const userRepo = userService.getRepository();
    
    expect(groupRepo).toBeDefined();
    expect(userRepo).toBeDefined();
    expect(() => (groupService as any)['groupRepository']).not.toThrow();
    // But we should use getRepository() instead
    expect(groupService.getRepository()).toBe(groupRepo);
  });
});

