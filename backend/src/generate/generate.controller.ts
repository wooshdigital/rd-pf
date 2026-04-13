import { Controller, Post, Get, Body, Param, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { GenerateDto } from './dto/generate.dto';

interface GenerateJob {
  status: 'running' | 'done' | 'error';
  result?: any;
  error?: string;
}

@Controller('generate-project')
export class GenerateController {
  private jobs = new Map<string, GenerateJob>();

  constructor(private readonly aiService: AiService) {}

  @Post()
  async generate(@Body() dto: GenerateDto) {
    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.jobs.set(jobId, { status: 'running' });

    // Run generation in background
    this.aiService.generateProject(dto.project, dto.webSearch)
      .then((files) => {
        const job = this.jobs.get(jobId);
        if (job) {
          job.status = 'done';
          job.result = files;
        }
      })
      .catch((err) => {
        const job = this.jobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = err.message || 'Generation failed';
        }
      });

    return { jobId };
  }

  @Get('/job/:id')
  getJob(@Param('id') id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }
}
