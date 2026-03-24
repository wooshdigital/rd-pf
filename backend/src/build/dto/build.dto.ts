import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class BuildDto {
  @IsObject()
  @IsNotEmpty()
  project: { name: string };

  @IsObject()
  @IsNotEmpty()
  files: {
    files: Record<string, string>;
    commitOrder: any[];
  };

  @IsObject()
  @IsNotEmpty()
  timeline: { start: string; end: string };

  @IsString()
  @IsNotEmpty()
  githubUser: string;

  @IsString()
  @IsNotEmpty()
  githubName: string;

  @IsString()
  @IsNotEmpty()
  githubToken: string;
}
