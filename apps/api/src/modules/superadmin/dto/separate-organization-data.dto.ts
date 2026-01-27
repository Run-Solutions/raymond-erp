import { IsOptional, IsBoolean } from 'class-validator';

export class SeparateOrganizationDataDto {
    // targetOrganizationId comes from route parameter, not body
    @IsOptional()
    @IsBoolean()
    createTestData?: boolean = false;

    @IsOptional()
    @IsBoolean()
    reassignSharedData?: boolean = true;
}

