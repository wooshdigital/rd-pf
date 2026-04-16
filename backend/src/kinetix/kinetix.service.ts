import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';

export interface KinetixIdentityListItem {
  id: string;
  name: string;
  headshot: string | null;
  maxOljVerificationScore: number | null;
  maxLinkedinVerificationScore: number | null;
  isActive: boolean;
  isRecommended: boolean;
}

export interface KinetixIdentityDetail extends KinetixIdentityListItem {
  firstName: string | null;
  lastName: string | null;
  textCv: {
    collegeCourse: string | null;
    graduationYear: number | null;
    companies: Array<{ name: string; startDate: string; endDate: string }>;
  };
  activeCvs: Array<{ title: string; url: string; validationScore: number | null }>;
}

@Injectable()
export class KinetixService {
  private readonly logger = new Logger(KinetixService.name);

  private get apiUrl() {
    return process.env.KINETIX_API_URL || 'https://kinetix.roochedigital.com';
  }

  private get apiKey() {
    return process.env.KINETIX_API_KEY || '';
  }

  async listIdentities(search?: string): Promise<KinetixIdentityListItem[]> {
    const data = await this.call<{ success: boolean; data: KinetixIdentityListItem[] }>(
      '/api/external/identities' + (search ? `?search=${encodeURIComponent(search)}` : ''),
    );
    return this.absolutizeAll(data.data || []);
  }

  async getIdentity(id: string): Promise<KinetixIdentityDetail> {
    const data = await this.call<{ success: boolean; data: KinetixIdentityDetail }>(
      `/api/external/identities/${encodeURIComponent(id)}`,
    );
    return this.absolutize(data.data);
  }

  private async call<T>(path: string): Promise<T> {
    if (!this.apiKey) {
      throw new HttpException(
        'KINETIX_API_KEY is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `${this.apiUrl}${path}`;
    this.logger.log(`→ GET ${url}`);

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      this.logger.error(`← ${resp.status}: ${body.slice(0, 200)}`);
      throw new HttpException(
        `Kinetix API error: ${resp.status}`,
        resp.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_GATEWAY,
      );
    }

    return resp.json() as Promise<T>;
  }

  // Upload URLs stored in kinetix are often root-relative (/uploads/...).
  // Rewrite them to absolute so the rd-pf frontend can render them directly.
  private absolutize<T extends { headshot: string | null }>(item: T): T {
    if (item?.headshot && item.headshot.startsWith('/')) {
      item.headshot = `${this.apiUrl}${item.headshot}`;
    }
    return item;
  }

  private absolutizeAll<T extends { headshot: string | null }>(items: T[]): T[] {
    return items.map((i) => this.absolutize(i));
  }
}
