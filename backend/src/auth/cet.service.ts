import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CetService {
  private readonly logger = new Logger(CetService.name);

  private get cetUrl() {
    return process.env.CET_BASE_URL || 'https://cet.roochedigital.com';
  }

  private get cetApiKey() {
    return process.env.CET_API_KEY || '';
  }

  private get toolName() {
    return process.env.CET_TOOL_NAME || 'PortfolioForge';
  }

  async checkAccess(email: string): Promise<boolean> {
    if (!this.cetApiKey) {
      this.logger.warn('CET_API_KEY not configured, denying access');
      return false;
    }

    try {
      const url = `${this.cetUrl}/api/v1/auth/check-access-simple/${encodeURIComponent(email)}`;
      const resp = await fetch(`${url}?tool=${this.toolName}&api_key=${this.cetApiKey}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!resp.ok) {
        this.logger.warn(`CET access check failed: ${resp.status} for ${email}`);
        return false;
      }

      const data = await resp.json();
      if (data.has_access) {
        this.logger.log(`CET access granted for ${email}`);
        return true;
      }

      this.logger.warn(`CET access denied for ${email}`);
      return false;
    } catch (err: any) {
      this.logger.error(`CET access check error: ${err.message}`);
      return false;
    }
  }
}
