import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateJournalEntryDto } from './create-journal-entry.dto';

export class UpdateJournalEntryDto extends PartialType(OmitType(CreateJournalEntryDto, ['journal_lines'] as const)) {}
