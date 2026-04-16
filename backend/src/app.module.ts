import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { GenerateModule } from './generate/generate.module';
import { BuildModule } from './build/build.module';
import { AuthModule } from './auth/auth.module';
import { KinetixModule } from './kinetix/kinetix.module';

@Module({
  imports: [ConfigModule.forRoot(), AiModule, AnalyzeModule, GenerateModule, BuildModule, AuthModule, KinetixModule],
})
export class AppModule {}
