import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export interface User {
  id: string;
  email: string;
  google_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'missing-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing-secret',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      done(new Error('No email found from Google profile'), false);
      return;
    }

    try {
      // Find or create user
      const result = await this.pool.query<User>(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2',
        [id, email],
      );

      let user: User | undefined = result.rows[0];

      if (!user) {
        // Create new user
        const insertResult = await this.pool.query<User>(
          'INSERT INTO users (email, google_id) VALUES ($1, $2) RETURNING *',
          [email, id],
        );
        user = insertResult.rows[0];
        this.logger.log(`Created new user for email: ${email}`);
      } else if (!user.google_id) {
        // Link existing email to google account
        const updateResult = await this.pool.query<User>(
          'UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *',
          [id, email],
        );
        user = updateResult.rows[0];
      }

      done(null, user);
    } catch (error) {
      this.logger.error('Error in Google Strategy validate', error);
      done(error instanceof Error ? error : new Error(String(error)), false);
    }
  }
}
