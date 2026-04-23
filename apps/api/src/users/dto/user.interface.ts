import { Role } from '../../common/enums/role.enum';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
