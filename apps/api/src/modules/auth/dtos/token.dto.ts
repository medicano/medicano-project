export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
}
