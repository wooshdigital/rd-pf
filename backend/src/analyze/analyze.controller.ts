import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { AnalyzeDto } from './dto/analyze.dto';

@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  async analyze(@Body() dto: AnalyzeDto) {
    if (dto.file) {
      return this.aiService.analyzeResumeFile(dto.file.data, dto.file.mediaType, dto.webSearch);
    }
    if (dto.resume) {
      return this.aiService.analyzeResume(dto.resume, dto.webSearch);
    }
    throw new BadRequestException('Provide either resume text or a file upload');
  }
}
