import { Injectable, Logger, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface DomainAvailability {
  domain: string;
  available: boolean;
  isPremium: boolean;
  premiumRegistrationPrice?: number;
}

export interface DomainPrice {
  tld: string;
  price: number;
  duration: number;
}

export interface RegisterContact {
  FirstName: string;
  LastName: string;
  Address1: string;
  City: string;
  StateProvince: string;
  PostalCode: string;
  Country: string;
  Phone: string;
  EmailAddress: string;
}

export interface RegisterResult {
  domain: string;
  registered: boolean;
  orderId?: string;
  transactionId?: string;
  chargedAmount?: number;
}

const COMMON_TLDS = ['com', 'dev', 'io', 'app', 'me', 'xyz'];

@Injectable()
export class NamecheapService {
  private readonly logger = new Logger(NamecheapService.name);
  private readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  private get apiUser() {
    return process.env.NAMECHEAP_API_USER || '';
  }
  private get apiKey() {
    return process.env.NAMECHEAP_API_KEY || '';
  }
  private get clientIp() {
    return process.env.NAMECHEAP_CLIENT_IP || '';
  }
  private get sandbox() {
    return (process.env.NAMECHEAP_SANDBOX || 'true') === 'true';
  }
  private get endpoint() {
    return this.sandbox
      ? 'https://api.sandbox.namecheap.com/xml.response'
      : 'https://api.namecheap.com/xml.response';
  }

  private assertConfigured() {
    if (!this.apiUser || !this.apiKey || !this.clientIp) {
      throw new ServiceUnavailableException(
        'Namecheap not configured: set NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP',
      );
    }
  }

  async check(domains: string[]): Promise<DomainAvailability[]> {
    this.assertConfigured();
    if (domains.length === 0) return [];
    if (domains.length > 50) domains = domains.slice(0, 50);

    const res = await this.call('namecheap.domains.check', { DomainList: domains.join(',') });
    const items = this.asArray(res?.CommandResponse?.DomainCheckResult);

    return items.map((i: any) => ({
      domain: i['@_Domain'],
      available: i['@_Available'] === 'true',
      isPremium: i['@_IsPremiumName'] === 'true',
      premiumRegistrationPrice: i['@_PremiumRegistrationPrice']
        ? parseFloat(i['@_PremiumRegistrationPrice'])
        : undefined,
    }));
  }

  /**
   * Namecheap has no real domain-suggest endpoint. We approximate by
   * checking the base name against common TLDs in parallel.
   */
  async suggest(baseName: string): Promise<DomainAvailability[]> {
    const slug = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) return [];
    const candidates = COMMON_TLDS.map((tld) => `${slug}.${tld}`);
    return this.check(candidates);
  }

  async getPrice(tld: string): Promise<DomainPrice | null> {
    this.assertConfigured();
    const res = await this.call('namecheap.users.getPricing', {
      ProductType: 'DOMAIN',
      ProductCategory: 'REGISTER',
      ActionName: 'REGISTER',
      ProductName: tld,
    });

    const productType = res?.CommandResponse?.UserGetPricingResult?.ProductType;
    const products = this.asArray(productType?.ProductCategory?.Product);
    const match = products.find((p: any) => p['@_Name']?.toLowerCase() === tld.toLowerCase());
    const prices = this.asArray(match?.Price);
    const oneYear = prices.find((p: any) => p['@_Duration'] === '1');
    if (!oneYear) return null;

    return {
      tld,
      price: parseFloat(oneYear['@_Price']),
      duration: 1,
    };
  }

  async register(
    domain: string,
    years: number,
    contact: RegisterContact,
  ): Promise<RegisterResult> {
    this.assertConfigured();

    // Namecheap requires all 4 contact roles — send the same contact 4 times
    const contactParams: Record<string, string> = {};
    for (const role of ['Registrant', 'Tech', 'Admin', 'AuxBilling']) {
      for (const [k, v] of Object.entries(contact)) {
        contactParams[`${role}${k}`] = v;
      }
    }

    const res = await this.call('namecheap.domains.create', {
      DomainName: domain,
      Years: years.toString(),
      ...contactParams,
    });

    const result = res?.CommandResponse?.DomainCreateResult;
    if (!result) {
      throw new HttpException('Unexpected Namecheap response', HttpStatus.BAD_GATEWAY);
    }

    return {
      domain: result['@_Domain'] || domain,
      registered: result['@_Registered'] === 'true',
      orderId: result['@_OrderID'],
      transactionId: result['@_TransactionID'],
      chargedAmount: result['@_ChargedAmount']
        ? parseFloat(result['@_ChargedAmount'])
        : undefined,
    };
  }

  async setDnsToServer(domain: string, serverIp: string): Promise<void> {
    this.assertConfigured();
    const [sld, ...tldParts] = domain.split('.');
    const tld = tldParts.join('.');

    await this.call('namecheap.domains.dns.setHosts', {
      SLD: sld,
      TLD: tld,
      HostName1: '@',
      RecordType1: 'A',
      Address1: serverIp,
      TTL1: '300',
      HostName2: 'www',
      RecordType2: 'A',
      Address2: serverIp,
      TTL2: '300',
    });

    this.logger.log(`DNS set: ${domain} → ${serverIp}`);
  }

  private async call(command: string, params: Record<string, string>): Promise<any> {
    const url = new URL(this.endpoint);
    url.searchParams.set('ApiUser', this.apiUser);
    url.searchParams.set('ApiKey', this.apiKey);
    url.searchParams.set('UserName', this.apiUser);
    url.searchParams.set('ClientIp', this.clientIp);
    url.searchParams.set('Command', command);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    this.logger.log(`→ ${command} (sandbox=${this.sandbox})`);
    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      throw new HttpException(
        `Namecheap HTTP ${resp.status}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const xml = await resp.text();
    const parsed = this.parser.parse(xml);
    const apiResp = parsed?.ApiResponse;

    if (apiResp?.['@_Status'] !== 'OK') {
      const errors = this.asArray(apiResp?.Errors?.Error);
      const msg = errors.map((e: any) => e['#text'] || e).join('; ') || 'Unknown Namecheap error';
      this.logger.error(`← ${command} failed: ${msg}`);
      throw new HttpException(`Namecheap: ${msg}`, HttpStatus.BAD_GATEWAY);
    }

    this.logger.log(`← ${command} OK`);
    return apiResp;
  }

  private asArray<T>(v: T | T[] | undefined): T[] {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  }
}
