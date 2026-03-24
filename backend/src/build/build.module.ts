import { Module } from '@nestjs/common';
import { BuildController } from './build.controller';
import { JobsService } from './jobs.service';
import { TimelineService } from './timeline.service';
import { RepoBuilderService } from './repo-builder.service';

@Module({
  controllers: [BuildController],
  providers: [JobsService, TimelineService, RepoBuilderService],
})
export class BuildModule {}
