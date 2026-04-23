import { UserRole } from '../enums/user-role.enum';

export class UserResponseDto {
  id: string;
  clinicId: string;
  role: UserRole;
  email?: string;
  username?: string;
}
