import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          let data = request?.cookies['auth_token'];
          if (!data) {
            return null;
          }
          return data;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [
      payload.sub,
    ]);
    const user = result.rows[0];

    if (!user) {
      throw new UnauthorizedException();
    }
    
    // We omit sensitive details if any, but returning the user object makes it available on req.user
    return { id: user.id, email: user.email };
  }
}
