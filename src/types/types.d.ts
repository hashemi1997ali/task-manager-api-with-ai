export {};

declare global {
  namespace Express {
    interface AuthUser {
      userId: string;
      roles: string[];
    }

    interface Request {
      user?: AuthUser;
    }
  }
}
