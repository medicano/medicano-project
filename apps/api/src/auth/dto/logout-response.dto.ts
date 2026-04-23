export class LogoutResponseDto {
  readonly success: boolean;

  constructor(success: boolean) {
    this.success = success;
  }
}
