import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

const CONFIGURED = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== 'google-oauth-not-configured',
)

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!CONFIGURED) {
      const res  = context.switchToHttp().getResponse()
      const url  = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?error=google_not_configured`
      res.redirect(url)
      return false
    }
    return super.canActivate(context) as Promise<boolean>
  }
}
