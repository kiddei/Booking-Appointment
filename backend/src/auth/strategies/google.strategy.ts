import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, Profile } from 'passport-google-oauth20'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID:     process.env.GOOGLE_CLIENT_ID     || 'google-oauth-not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google-oauth-not-configured',
      callbackURL: `${process.env.BACKEND_URL ?? 'http://localhost:8080'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<{ googleId: string; email: string; name: string }> {
    return {
      googleId: profile.id,
      email:    profile.emails?.[0]?.value ?? '',
      name:     profile.displayName ?? '',
    }
  }
}
