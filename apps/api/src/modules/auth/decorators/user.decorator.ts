import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../dtos/token.dto';

export const User = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  }
);
