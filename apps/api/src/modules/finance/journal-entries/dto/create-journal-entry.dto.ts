import { IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLineDto {
    @IsUUID()
    debit_account_id: string;

    @IsUUID()
    credit_account_id: string;

    @IsNumber()
    @Min(0.01)
    amount: number;
}

export class CreateJournalEntryDto {
    @IsString()
    description: string;

    @IsDateString()
    date: string;

    @IsString()
    @IsOptional()
    reference?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => JournalLineDto)
    journal_lines: JournalLineDto[];
}
