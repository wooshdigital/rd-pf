import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class ContactDto {
  @IsString() @IsNotEmpty() FirstName: string;
  @IsString() @IsNotEmpty() LastName: string;
  @IsString() @IsNotEmpty() Address1: string;
  @IsString() @IsNotEmpty() City: string;
  @IsString() @IsNotEmpty() StateProvince: string;
  @IsString() @IsNotEmpty() PostalCode: string;
  @IsString() @IsNotEmpty() Country: string;
  @IsString() @IsNotEmpty() Phone: string;
  @IsString() @IsNotEmpty() EmailAddress: string;
}

export class BuyDomainDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  years?: number;

  @IsObject()
  @IsNotEmpty()
  contact: ContactDto;
}
