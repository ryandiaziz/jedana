import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let jwtService: { sign: jest.Mock };
  let res: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
    redirect: jest.Mock;
    json: jest.Mock;
  };
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    };
    controller = new AuthController(jwtService as any);
    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('googleAuthRedirect', () => {
    it('sets secure cookie and redirects to FRONTEND_URL when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://jedana.test';

      controller.googleAuthRedirect(
        { user: { id: 'u1', email: 'a@b.c' } } as any,
        res as any,
      );

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'a@b.c',
        sub: 'u1',
      });
      expect(res.cookie).toHaveBeenCalledWith(
        'auth_token',
        'signed.jwt.token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith('https://jedana.test');
    });

    it('sets secure: false when NODE_ENV is not production and falls back to default URL', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.FRONTEND_URL;

      controller.googleAuthRedirect(
        { user: { id: 'u1', email: 'a@b.c' } } as any,
        res as any,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'auth_token',
        'signed.jwt.token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/');
    });
  });

  describe('getProfile', () => {
    it('returns the user object from request', () => {
      const user = { id: 'u1', email: 'a@b.c' };
      const profile = controller.getProfile({ user } as any);
      expect(profile).toBe(user);
    });
  });

  describe('logout', () => {
    it('clears auth_token cookie and returns logout message', () => {
      controller.logout(res as any);
      expect(res.clearCookie).toHaveBeenCalledWith('auth_token');
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
    });
  });
});
