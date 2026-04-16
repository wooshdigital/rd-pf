import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class PreviewDto {
  @IsString()
  @IsNotEmpty()
  theme: string;

  @IsObject()
  @IsNotEmpty()
  content: any;
}
