import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const CurrentUserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Role | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { role: Role } }>();
    return request.user?.role;
  },
);
