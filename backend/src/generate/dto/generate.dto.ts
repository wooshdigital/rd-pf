import { IsNotEmpty, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class GenerateDto {
  @IsObject()
  @IsNotEmpty()
  project: {
    name: string;
    description: string;
    tech: string[];
    complexity: string;
  };

  @IsBoolean()
  @IsOptional()
  webSearch?: boolean;
}
