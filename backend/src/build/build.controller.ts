import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { TimelineService } from './timeline.service';
import { RepoBuilderService } from './repo-builder.service';
import { BuildDto } from './dto/build.dto';

@Controller('build-repo')
export class BuildController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly timelineService: TimelineService,
    private readonly repoBuilderService: RepoBuilderService,
  ) {}

  @Post()
  async build(@Body() dto: BuildDto) {
    const jobId = this.jobsService.create();

    // Run async — return jobId immediately
    this.runBuild(jobId, dto).catch(() => {});

    return { jobId };
  }

  @Get('/job/:id')
  getJob(@Param('id') id: string): { status: string; log: string[] } {
    return this.jobsService.get(id);
  }

  private async runBuild(jobId: string, dto: BuildDto) {
    try {
      const commitPlan = this.timelineService.buildCommitPlan(
        dto.files,
        dto.timeline,
      );

      await this.repoBuilderService.createRepoWithCommits({
        projectName: dto.project.name,
        files: dto.files,
        commitPlan,
        githubUser: dto.githubUser,
        githubName: dto.githubName,
        githubToken: dto.githubToken,
        log: (msg) => this.jobsService.log(jobId, msg),
      });

      this.jobsService.complete(jobId);
    } catch (err: any) {
      this.jobsService.fail(jobId, err.message);
    }
  }
}
