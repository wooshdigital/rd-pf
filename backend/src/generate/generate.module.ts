import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GenerateController } from './generate.controller';

@Module({
  imports: [AiModule],
  controllers: [GenerateController],
})
export class GenerateModule {}
