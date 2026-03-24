import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CetService } from './cet.service';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [CetService, SessionService],
  exports: [SessionService],
})
export class AuthModule {}
