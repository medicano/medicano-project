import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  number!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  complement?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  neighborhood!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ minLength: 2, maxLength: 2, example: 'SP' })
  @IsString()
  @Length(2, 2)
  state!: string;

  @ApiProperty({ pattern: '^\\d{8}$', example: '01310930' })
  @IsString()
  @Matches(/^\d{8}$/)
  zipCode!: string;
}
