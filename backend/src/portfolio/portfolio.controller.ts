import { Controller, Get, Post, Body, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ThemesService, PortfolioContent } from './themes.service';
import { AiService } from '../ai/ai.service';
import { KinetixService } from '../kinetix/kinetix.service';
import { DeployService } from './deploy.service';
import { NamecheapService } from './namecheap.service';
import { PreviewDto } from './dto/preview.dto';
import { GenerateDto } from './dto/generate.dto';
import { DeployDto } from './dto/deploy.dto';
import { BuyDomainDto } from './dto/buy-domain.dto';

interface GenerateJob {
  status: 'running' | 'done' | 'error';
  result?: PortfolioContent;
  error?: string;
}

interface DeployJob {
  status: 'running' | 'done' | 'error';
  log: string[];
  url?: string;
  error?: string;
}

@Controller('portfolio')
export class PortfolioController {
  private jobs = new Map<string, GenerateJob>();
  private deployJobs = new Map<string, DeployJob>();

  constructor(
    private readonly themesService: ThemesService,
    private readonly aiService: AiService,
    private readonly kinetixService: KinetixService,
    private readonly deployService: DeployService,
    private readonly namecheapService: NamecheapService,
  ) {}

  @Get('domains/check')
  async checkDomain(@Query('name') name: string) {
    if (!name) throw new BadRequestException('name is required');
    const result = await this.namecheapService.check([name]);
    return { result: result[0] || null };
  }

  @Get('domains/suggest')
  async suggestDomains(@Query('query') query: string) {
    if (!query) throw new BadRequestException('query is required');
    const results = await this.namecheapService.suggest(query);
    return { results };
  }

  @Get('domains/price')
  async getPrice(@Query('tld') tld: string) {
    if (!tld) throw new BadRequestException('tld is required');
    const cleanTld = tld.replace(/^\./, '');
    const price = await this.namecheapService.getPrice(cleanTld);
    return { price };
  }

  @Post('domains/buy')
  async buyDomain(@Body() dto: BuyDomainDto) {
    const years = dto.years || 1;
    const result = await this.namecheapService.register(dto.domain, years, dto.contact);

    if (result.registered) {
      const serverIp = process.env.NAMECHEAP_CLIENT_IP || '159.65.11.83';
      await this.namecheapService.setDnsToServer(dto.domain, serverIp);
    }

    return result;
  }

  @Get('themes')
  listThemes() {
    return { themes: this.themesService.list() };
  }

  @Post('preview')
  preview(@Body() dto: PreviewDto) {
    const html = this.themesService.render(dto.theme, dto.content);
    return { html };
  }

  @Post('generate')
  async generate(@Body() dto: GenerateDto) {
    if (!dto.identityId || !dto.cvUrl) {
      throw new BadRequestException('identityId and cvUrl are required');
    }

    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.jobs.set(jobId, { status: 'running' });

    this.runGeneration(jobId, dto).catch((err) => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = err.message || 'Generation failed';
      }
    });

    return { jobId };
  }

  @Get('generate/job/:id')
  getJob(@Param('id') id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  @Post('deploy')
  deploy(@Body() dto: DeployDto) {
    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const job: DeployJob = { status: 'running', log: [] };
    this.deployJobs.set(jobId, job);

    const html = this.themesService.render(dto.theme, dto.content);
    const log = (msg: string) => job.log.push(msg);

    const run = async () => {
      if (dto.waitForDns) {
        const serverIp = process.env.NAMECHEAP_CLIENT_IP || '159.65.11.83';
        await this.deployService.waitForDns(dto.domain, serverIp, 10 * 60 * 1000, log);
      }
      return this.deployService.deploy(dto.domain, html, log);
    };

    run()
      .then((result) => {
        job.status = 'done';
        job.url = result.url;
      })
      .catch((err) => {
        job.status = 'error';
        job.error = err.message || 'Deploy failed';
        job.log.push(`ERROR: ${job.error}`);
      });

    return { jobId };
  }

  @Get('deploy/job/:id')
  getDeployJob(@Param('id') id: string) {
    const job = this.deployJobs.get(id);
    if (!job) throw new NotFoundException('Deploy job not found');
    return job;
  }

  private async runGeneration(jobId: string, dto: GenerateDto) {
    // 1. Fetch identity detail (for headshot + contact + education)
    const identity = await this.kinetixService.getIdentity(dto.identityId);

    // 2. Download the selected CV
    const cvResp = await fetch(dto.cvUrl);
    if (!cvResp.ok) throw new Error(`Failed to download CV: ${cvResp.status}`);
    const buf = Buffer.from(await cvResp.arrayBuffer());
    const base64 = buf.toString('base64');
    const mediaType = cvResp.headers.get('content-type')?.split(';')[0] || 'application/pdf';

    // 3. Analyze the CV
    const analysis = await this.aiService.analyzeResumeFile(base64, mediaType);

    // 4. Generate polished portfolio copy
    const copy = await this.aiService.generatePortfolioContent(analysis, identity);

    // 5. Merge into a complete PortfolioContent
    const content: PortfolioContent = {
      name: copy.name || analysis.name || identity.name,
      title: copy.title || analysis.timeline?.[0]?.role || 'Developer',
      headline: copy.headline || '',
      bio: copy.bio || '',
      aboutParagraph: copy.aboutParagraph || '',
      headshot: identity.headshot,
      skills: analysis.skills || [],
      projects: (analysis.projects || []).map((p: any) => ({
        name: p.name,
        description: copy.projectDescriptions?.[p.name] || p.description,
        tech: p.tech || [],
        githubUrl: dto.githubUser ? `https://github.com/${dto.githubUser}/${p.name}` : '',
      })),
      experience: (analysis.timeline || []).map((t: any) => ({
        role: t.role,
        org: t.org,
        start: t.start,
        end: t.end,
      })),
      contact: {
        email: dto.email,
        github: dto.githubUser,
        linkedin: dto.linkedin,
      },
    };

    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'done';
      job.result = content;
    }
  }
}
