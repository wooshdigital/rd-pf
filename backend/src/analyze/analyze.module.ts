import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AnalyzeController } from './analyze.controller';

@Module({
  imports: [AiModule],
  controllers: [AnalyzeController],
})
export class AnalyzeModule {}
