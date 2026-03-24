import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SessionUser {
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

interface Session {
  token: string;
  user: SessionUser;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  private sessions = new Map<string, Session>();

  create(user: SessionUser): string {
    const token = crypto.randomBytes(32).toString('hex');
    const days = parseInt(process.env.SESSION_EXPIRATION_DAYS || '5');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    this.sessions.set(token, { token, user, expiresAt });
    return token;
  }

  verify(token: string): SessionUser | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }
    return session.user;
  }

  destroy(token: string): void {
    this.sessions.delete(token);
  }

  /** CET signin — create session for an already-authorized user by email */
  createForEmail(email: string, name: string, daysExpiration?: number): { token: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const days = daysExpiration || parseInt(process.env.SESSION_EXPIRATION_DAYS || '5');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    this.sessions.set(token, {
      token,
      user: { email, name, picture: '', googleId: '' },
      expiresAt,
    });

    return { token, expiresAt };
  }

  /** CET unauthorize — destroy all sessions for an email */
  destroyByEmail(email: string): void {
    for (const [token, session] of this.sessions) {
      if (session.user.email === email) {
        this.sessions.delete(token);
      }
    }
  }
}
