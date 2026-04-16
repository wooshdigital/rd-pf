import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class DeployDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  theme: string;

  @IsObject()
  @IsNotEmpty()
  content: any;

  @IsBoolean()
  @IsOptional()
  waitForDns?: boolean;
}
