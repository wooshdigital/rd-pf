import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dns from 'dns/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DeployResult {
  url: string;
  domain: string;
  directory: string;
}

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  private get baseDir() {
    return process.env.PORTFOLIOS_BASE_DIR || '/var/www/html/portfolios';
  }

  /**
   * Wait for a domain's A record to resolve to our server IP via public DNS.
   * Returns when DNS is ready; throws if the timeout is exceeded.
   */
  async waitForDns(domain: string, serverIp: string, timeoutMs: number, log: (msg: string) => void = () => {}): Promise<void> {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);

    const deadline = Date.now() + timeoutMs;
    log(`Waiting for DNS: ${domain} → ${serverIp} (timeout ${Math.round(timeoutMs / 1000)}s)`);

    while (Date.now() < deadline) {
      try {
        const records = await resolver.resolve4(domain);
        if (records.includes(serverIp)) {
          log(`DNS ready: ${domain} → ${records.join(', ')}`);
          return;
        }
        log(`DNS not yet pointing to ${serverIp} (got ${records.join(', ')}); retrying in 15s`);
      } catch (err: any) {
        log(`DNS lookup failed: ${err.code || err.message}; retrying in 15s`);
      }
      await new Promise((r) => setTimeout(r, 15_000));
    }

    throw new Error(`DNS did not propagate for ${domain} within timeout`);
  }

  /**
   * Deploy a rendered portfolio HTML string to a domain.
   * Assumes DNS already points to this server — call waitForDns first if needed.
   */
  async deploy(domain: string, html: string, log: (msg: string) => void = () => {}): Promise<DeployResult> {
    this.validateDomain(domain);

    const dir = path.join(this.baseDir, domain);
    log(`Writing portfolio files to ${dir}`);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), html, 'utf8');

    log(`Writing nginx config for ${domain}`);
    await this.writeNginxConfig(domain, dir);

    log('Testing nginx configuration');
    await this.runCmd('nginx -t');

    log('Reloading nginx');
    await this.runCmd('systemctl reload nginx');

    log(`Requesting SSL certificate for ${domain}`);
    await this.runCertbotWithRetry(domain, log);

    log('Reloading nginx with SSL enabled');
    await this.runCmd('systemctl reload nginx');

    const url = `https://${domain}`;
    log(`Deployed: ${url}`);
    return { url, domain, directory: dir };
  }

  private validateDomain(domain: string) {
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
      throw new BadRequestException(`Invalid domain: ${domain}`);
    }
  }

  private async writeNginxConfig(domain: string, rootDir: string) {
    const configPath = `/etc/nginx/sites-available/${domain}`;
    const enabledPath = `/etc/nginx/sites-enabled/${domain}`;

    const config = `server {
    server_name ${domain} www.${domain};
    client_max_body_size 10M;

    root ${rootDir};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 80;
}
`;
    await fs.writeFile(configPath, config, 'utf8');

    // Idempotent symlink
    try {
      await fs.unlink(enabledPath);
    } catch { /* ignore */ }
    await fs.symlink(configPath, enabledPath);
  }

  private async runCertbotWithRetry(domain: string, log: (msg: string) => void) {
    const email = process.env.CERTBOT_EMAIL || 'admin@rooche.digital';
    const cmd = `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --email ${email} --redirect`;

    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log(`certbot attempt ${attempt}/3`);
        await this.runCmd(cmd, 120_000);
        return;
      } catch (err: any) {
        lastErr = err;
        log(`certbot failed: ${err.message}`);
        if (attempt < 3) {
          log('Waiting 30s before retry');
          await new Promise((r) => setTimeout(r, 30_000));
        }
      }
    }
    throw new InternalServerErrorException(
      `Certbot failed after 3 attempts: ${lastErr?.message || 'unknown'}`,
    );
  }

  private async runCmd(cmd: string, timeoutMs: number = 30_000): Promise<string> {
    try {
      const { stdout } = await execAsync(cmd, { timeout: timeoutMs });
      return stdout;
    } catch (err: any) {
      const msg = err.stderr || err.stdout || err.message;
      this.logger.error(`Command failed: ${cmd}\n${msg}`);
      throw new Error(msg.toString().trim().slice(0, 500));
    }
  }
}
