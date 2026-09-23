import { Controller, Post, Body, Req, Get, UseGuards, Ip, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { SwitchOrganizationDto } from './dto/switch-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'User successfully logged in' })
    async login(@Body() dto: LoginDto, @Req() req, @Ip() ip) {
        return this.authService.login(dto, ip, req.headers['user-agent']);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'User successfully logged out' })
    async logout(@Body() dto: LogoutDto) {
        return this.authService.logout(dto.refreshToken);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset' })
    @ApiResponse({ status: 200, description: 'Reset token generated (mock email)' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

@Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password' })
    @ApiResponse({ status: 200, description: 'Password successfully reset' })
    @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    @Post('setup-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Set initial password and create PSQL user after data recovery' })
    @ApiResponse({ status: 200, description: 'User created and session started' })
    @ApiResponse({ status: 401, description: 'Invalid or expired password setup token' })
    @ApiResponse({ status: 409, description: 'User already exists in the system' })
    async setupPassword(@Body() dto: SetupPasswordDto, @Req() req, @Ip() ip) {
        return this.authService.setupPassword(dto, ip, req.headers['user-agent']);
    }

    @Get('organizations')
    @UseGuards(JwtAuthGuard, TenantGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get all organizations for the authenticated user' })
    @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getUserOrganizations(@Req() req) {
        // Ensure UserContext is set before calling service
        const { UserContext } = await import('../../common/context/user.context');
        const isSuperadmin = req.user.roles === 'Superadmin' || req.user.isSuperadmin === true;
        UserContext.setUser({
            id: req.user.id,
            roles: req.user.roles,
            isSuperadmin,
        });
        
        console.log(`[AuthController] getUserOrganizations - User: ${req.user.email}, isSuperadmin: ${isSuperadmin}`);
        const result = await this.authService.getUserOrganizations(req.user.id);
        console.log(`[AuthController] getUserOrganizations - Returning ${Array.isArray(result) ? result.length : 1} organizations`);
        return result;
    }

    @Post('switch-organization')
    @UseGuards(JwtAuthGuard, TenantGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Switch to a different organization' })
    @ApiResponse({ status: 200, description: 'Organization switched successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - No access to organization' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async switchOrganization(@Req() req, @Body() dto: SwitchOrganizationDto) {
        // Ensure UserContext is set before calling service
        const { UserContext } = await import('../../common/context/user.context');
        const isSuperadmin = req.user.roles === 'Superadmin' || req.user.isSuperadmin === true;
        UserContext.setUser({
            id: req.user.id,
            roles: req.user.roles,
            isSuperadmin,
        });
        
        console.log(`[AuthController] switchOrganization - User: ${req.user.email}, isSuperadmin: ${isSuperadmin}, targetOrg: ${dto.organization_id}`);
        return this.authService.switchOrganization(req.user.id, dto);
    }
}
