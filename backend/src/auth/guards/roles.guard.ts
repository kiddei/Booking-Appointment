import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'

const ROLE_LEVEL: Record<string, number> = {
  PLAYER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required) return true
    const { user } = ctx.switchToHttp().getRequest()
    const userLevel = ROLE_LEVEL[user?.role] ?? -1
    const hasAccess = required.some(role => userLevel >= (ROLE_LEVEL[role] ?? 0))
    if (!hasAccess) throw new ForbiddenException()
    return true
  }
}
