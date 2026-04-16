import { Controller, Get, Param, Query } from '@nestjs/common';
import { KinetixService } from './kinetix.service';

@Controller('identities')
export class KinetixController {
  constructor(private readonly kinetixService: KinetixService) {}

  @Get()
  async list(@Query('search') search?: string) {
    const data = await this.kinetixService.listIdentities(search);
    return { success: true, data };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const data = await this.kinetixService.getIdentity(id);
    return { success: true, data };
  }
}
