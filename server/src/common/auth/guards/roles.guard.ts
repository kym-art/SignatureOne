import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtUserPayload } from '../jwt.service';

/**
 * Guard complémentaire (exécuté après JwtAuthGuard) : vérifie que le rôle
 * indiqué dans le JWT figure parmi @Roles(...) défini sur la route.
 * Les routes sans @Roles() sont autorisées à tout utilisateur authentifié.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const klass = context.getClass();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ReflectAny = Reflect as any;
    const required: string[] = [
      ...(ReflectAny.getMetadata?.(ROLES_KEY, handler) ?? []),
      ...(ReflectAny.getMetadata?.(ROLES_KEY, klass) ?? []),
    ];
    if (!required || required.length === 0) {
      return true; // rôle déjà vérifié par JwtAuthGuard
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: JwtUserPayload = (context.switchToHttp().getRequest() as any).user;
    if (!user) {
      throw new ForbiddenException('Utilisateur introuvable dans le token');
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Accès réservé aux rôles: ${required.join(', ')}`
      );
    }
    return true;
  }
}
