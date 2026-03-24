import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FileUpload {
  @IsString()
  @IsNotEmpty()
  data: string;

  @IsString()
  @IsNotEmpty()
  mediaType: string;
}

export class AnalyzeDto {
  @IsString()
  @IsOptional()
  resume?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FileUpload)
  file?: FileUpload;

  @IsBoolean()
  @IsOptional()
  webSearch?: boolean;
}
