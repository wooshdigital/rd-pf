import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  identityId: string;

  @IsString()
  @IsNotEmpty()
  cvUrl: string;

  @IsString()
  @IsOptional()
  githubUser?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  linkedin?: string;
}
