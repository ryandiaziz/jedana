import {
  CanActivate,
  Injectable,
  Provider,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';

/**
 * Returns true only if all 3 required Google OAuth environment variables are set.
 */
export function isGoogleConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL,
  );
}

/**
 * Conditionally returns GoogleStrategy provider array based on environment configuration.
 */
export function getGoogleStrategyProviders(
  env: NodeJS.ProcessEnv = process.env,
): Provider[] {
  return isGoogleConfigured(env) ? [GoogleStrategy] : [];
}

/**
 * Route guard that blocks access to Google OAuth endpoints with HTTP 503
 * if Google credentials are not configured on the server.
 */
@Injectable()
export class GoogleConfiguredGuard implements CanActivate {
  canActivate(): boolean {
    if (!isGoogleConfigured()) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured on this server',
      );
    }
    return true;
  }
}
