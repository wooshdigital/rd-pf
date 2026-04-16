import { Module } from '@nestjs/common';
import { KinetixService } from './kinetix.service';
import { KinetixController } from './kinetix.controller';

@Module({
  providers: [KinetixService],
  controllers: [KinetixController],
  exports: [KinetixService],
})
export class KinetixModule {}
