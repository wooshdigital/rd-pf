import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { ThemesService } from './themes.service';
import { DeployService } from './deploy.service';
import { NamecheapService } from './namecheap.service';
import { AiModule } from '../ai/ai.module';
import { KinetixModule } from '../kinetix/kinetix.module';

@Module({
  imports: [AiModule, KinetixModule],
  controllers: [PortfolioController],
  providers: [ThemesService, DeployService, NamecheapService],
})
export class PortfolioModule {}
