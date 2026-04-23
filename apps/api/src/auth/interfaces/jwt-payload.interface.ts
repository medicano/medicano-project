import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
