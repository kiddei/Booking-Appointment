import {
  Controller, Post, Get, Body, Res, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { GoogleAuthGuard } from './guards/google-auth.guard'
import { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { CompleteGoogleProfileDto } from './dto/complete-google-profile.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto)
    res.cookie('access_token', token, COOKIE_OPTS)
    return user
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token')
    return { message: 'Logged out' }
  }

  /* ── Google OAuth ─────────────────────────────────────── */

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport redirects to Google — body never executes
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request & { user: any }, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    try {
      const result = await this.auth.googleLogin(req.user)
      if (result.exists) {
        res.cookie('access_token', result.token, COOKIE_OPTS)
        return res.redirect(`${frontendUrl}/dashboard`)
      }
      return res.redirect(`${frontendUrl}/auth/complete-profile?token=${result.pendingToken}`)
    } catch {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`)
    }
  }

  @Post('google/complete')
  @HttpCode(HttpStatus.CREATED)
  async completeGoogleProfile(
    @Body() dto: CompleteGoogleProfileDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.auth.completeGoogleProfile(dto)
    res.cookie('access_token', token, COOKIE_OPTS)
    return user
  }
}
