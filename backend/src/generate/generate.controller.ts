import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { GenerateDto } from './dto/generate.dto';

@Controller('generate-project')
export class GenerateController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  async generate(@Body() dto: GenerateDto) {
    const files = await this.aiService.generateProject(dto.project, dto.webSearch);
    return { files };
  }
}
