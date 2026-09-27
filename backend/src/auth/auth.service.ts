import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { CompleteGoogleProfileDto } from './dto/complete-google-profile.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials')
    }
    if (!user.active) {
      throw new UnauthorizedException('Account is disabled. Contact an administrator.')
    }
    const token = this.jwt.sign({ sub: user.id, username: user.username, role: user.role })
    return {
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    }
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    })
    if (exists) throw new ConflictException('Username or email already taken')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: { username: dto.username, email: dto.email, passwordHash },
    })
    return { id: user.id, username: user.username, email: user.email, role: user.role }
  }

  async googleLogin(googleProfile: { googleId: string; email: string; name: string }) {
    // 1. Existing user linked by googleId
    let user = await this.prisma.user.findUnique({ where: { googleId: googleProfile.googleId } })
    if (user) {
      if (!user.active) throw new UnauthorizedException('Account is disabled. Contact an administrator.')
      const token = this.jwt.sign({ sub: user.id, username: user.username, role: user.role })
      return { exists: true as const, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } }
    }

    // 2. Existing local user with same email → link accounts
    user = await this.prisma.user.findUnique({ where: { email: googleProfile.email } })
    if (user) {
      if (!user.active) throw new UnauthorizedException('Account is disabled. Contact an administrator.')
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleProfile.googleId, emailVerified: true, authProvider: 'google' },
      })
      const token = this.jwt.sign({ sub: user.id, username: user.username, role: user.role })
      return { exists: true as const, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } }
    }

    // 3. New user → issue short-lived pending token
    const pendingToken = this.jwt.sign(
      { googleId: googleProfile.googleId, email: googleProfile.email, name: googleProfile.name, type: 'google_pending' },
      { expiresIn: '10m' },
    )
    return { exists: false as const, pendingToken }
  }

  async completeGoogleProfile(dto: CompleteGoogleProfileDto) {
    let payload: any
    try {
      payload = this.jwt.verify(dto.pendingToken)
    } catch {
      throw new UnauthorizedException('Setup link has expired. Please sign in with Google again.')
    }
    if (payload?.type !== 'google_pending') {
      throw new UnauthorizedException('Invalid setup token.')
    }

    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: payload.email }] },
    })
    if (exists) throw new ConflictException('Username or email already taken.')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        username:      dto.username,
        email:         payload.email,
        passwordHash,
        googleId:      payload.googleId,
        emailVerified: true,
        authProvider:  'google',
      },
    })
    const token = this.jwt.sign({ sub: user.id, username: user.username, role: user.role })
    return { token, user: { id: user.id, username: user.username, email: user.email, role: user.role } }
  }
}
