import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: unknown, user: TUser): TUser {
    if (err) {
      throw err instanceof Error
        ? err
        : new Error(typeof err === 'string' ? err : JSON.stringify(err));
    }
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
