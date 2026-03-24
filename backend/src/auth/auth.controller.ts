import { Controller, Get, Post, Delete, Body, Query, Req, Res, Headers } from '@nestjs/common';
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { CetService } from './cet.service';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  private google: OAuth2Client;

  constructor(
    private readonly cetService: CetService,
    private readonly sessionService: SessionService,
  ) {
    this.google = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    );
  }

  // ─── Google OAuth (app login) ────────────────────────────────

  @Get('google/login')
  googleLogin(@Res() res: Response) {
    const url = this.google.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'select_account',
    });
    res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    try {
      // Exchange code for tokens
      const { tokens } = await this.google.getToken(code);
      const ticket = await this.google.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload()!;

      // Check CET access
      const hasAccess = await this.cetService.checkAccess(payload.email!);
      if (!hasAccess) {
        return res.redirect(
          `${frontendUrl}/login?error=access_denied&message=${encodeURIComponent('You do not have permission to access this application. Contact your administrator.')}`,
        );
      }

      // Create session
      const sessionToken = this.sessionService.create({
        email: payload.email!,
        name: payload.name || payload.email!,
        picture: payload.picture || '',
        googleId: payload.sub,
      });

      // Redirect to frontend with session token
      res.redirect(`${frontendUrl}?session_token=${sessionToken}`);
    } catch (err: any) {
      console.error('Google callback error:', err);
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @Get('me')
  getMe(@Req() req: Request, @Res() res: Response) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const user = this.sessionService.verify(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    res.json({ success: true, user });
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    this.sessionService.destroy(token);
    res.json({ success: true });
  }

  // ─── CET Integration Endpoints ──────────────────────────────

  @Post('authorize')
  cetAuthorize(@Body() body: any, @Headers('authorization') auth: string, @Res() res: Response) {
    if (!this.verifyCetToken(auth)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Portfolio Forge doesn't have a user DB — just acknowledge
    console.log(`[CET] Authorize: ${body.email} (${body.full_name})`);
    res.json({
      success: true,
      action: 'created',
      user: { email: body.email, full_name: body.full_name },
      message: 'User authorized successfully',
    });
  }

  @Delete('unauthorize')
  cetUnauthorize(@Body() body: any, @Headers('authorization') auth: string, @Res() res: Response) {
    if (!this.verifyCetToken(auth)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Destroy any active sessions for this user
    this.sessionService.destroyByEmail(body.email);
    console.log(`[CET] Unauthorize: ${body.email}`);
    res.json({
      success: true,
      action: 'deleted',
      user: { email: body.email },
      message: 'User unauthorized successfully',
    });
  }

  @Post('signin')
  cetSignin(@Body() body: any, @Headers('authorization') auth: string, @Res() res: Response) {
    if (!this.verifyCetToken(auth)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { email, days_of_expiration } = body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const { token, expiresAt } = this.sessionService.createForEmail(
      email,
      body.full_name || email,
      days_of_expiration,
    );

    console.log(`[CET] Signin: session created for ${email}`);
    res.json({
      success: true,
      token,
      expires_at: expiresAt.toISOString(),
      email,
      message: 'Session created successfully',
    });
  }

  // ─── GitHub OAuth (repo pushing — popup flow) ────────────────

  @Get('github')
  githubLogin(@Res() res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri:
        process.env.GITHUB_CALLBACK_URL ||
        'http://localhost:3000/api/auth/github/callback',
      scope: 'repo',
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  }

  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    try {
      const tokenResp = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
          }),
        },
      );

      const tokenData = await tokenResp.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const accessToken = tokenData.access_token;

      const userResp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = await userResp.json();

      const payload = JSON.stringify({
        type: 'github-auth',
        token: accessToken,
        user: user.login,
        name: user.name || user.login,
        avatar: user.avatar_url,
      });

      res.type('html').send(`<!DOCTYPE html>
<html><body>
<p>Logging in...</p>
<script>
  if (window.opener) {
    window.opener.postMessage(${payload}, '*');
    window.close();
  } else {
    document.body.textContent = 'Login successful. You can close this window.';
  }
</script>
</body></html>`);
    } catch (err: any) {
      res.type('html').send(`<!DOCTYPE html>
<html><body>
<p>Login failed: ${err.message}</p>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'github-auth-error', error: ${JSON.stringify(err.message)} }, '*');
    setTimeout(() => window.close(), 2000);
  }
</script>
</body></html>`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private verifyCetToken(auth: string | undefined): boolean {
    const expected = process.env.CET_API_TOKEN;
    if (!expected || !auth) return false;
    const token = auth.replace('Bearer ', '');
    return token === expected;
  }
}
