import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

describe('RolesGuard', () => {
  let rolesGuard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const buildContext = (role?: Role): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => (role !== undefined ? { user: { role } } : {}),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    rolesGuard = new RolesGuard(reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = rolesGuard.canActivate(buildContext(Role.PATIENT));

    expect(result).toBe(true);
  });

  it('should allow access when required roles array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const result = rolesGuard.canActivate(buildContext(Role.PATIENT));

    expect(result).toBe(true);
  });

  it('should allow access when user role matches required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CLINIC]);

    const result = rolesGuard.canActivate(buildContext(Role.CLINIC));

    expect(result).toBe(true);
  });

  it('should allow access when user role is in required roles list', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CLINIC, Role.ATTENDANT]);

    const result = rolesGuard.canActivate(buildContext(Role.ATTENDANT));

    expect(result).toBe(true);
  });

  it('should deny access when user role does not match', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CLINIC]);

    const result = rolesGuard.canActivate(buildContext(Role.PATIENT));

    expect(result).toBe(false);
  });

  it('should deny access when user is undefined on request', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CLINIC]);

    const context: ExecutionContext = {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    const result = rolesGuard.canActivate(context);

    expect(result).toBe(false);
  });
});
