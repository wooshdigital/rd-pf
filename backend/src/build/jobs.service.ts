import { Injectable, NotFoundException } from '@nestjs/common';

interface Job {
  status: 'running' | 'done' | 'error';
  log: string[];
}

@Injectable()
export class JobsService {
  private jobs = new Map<string, Job>();

  create(): string {
    const id = Date.now().toString(36);
    this.jobs.set(id, { status: 'running', log: [] });
    return id;
  }

  log(id: string, message: string) {
    const job = this.jobs.get(id);
    if (job) job.log.push(message);
  }

  complete(id: string) {
    const job = this.jobs.get(id);
    if (job) job.status = 'done';
  }

  fail(id: string, error: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'error';
      job.log.push(`ERROR: ${error}`);
    }
  }

  get(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }
}
