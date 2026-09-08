import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '../jwt.service';
import { PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global : vérifie le JWT Bearer sur chaque requête, sauf route @Public().
 * Le rôle provient du JWT signé par le serveur (login via backend), JAMAIS depuis
 * le localStorage côté client → contournement impossible.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const klass = context.getClass();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ReflectAny = Reflect as any;
    const isPublic =
      ReflectAny.getMetadata?.(PUBLIC_KEY, handler) === true ||
      ReflectAny.getMetadata?.(PUBLIC_KEY, klass) === true;
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('JWT manquant');
    }
    const token = auth.slice('Bearer '.length);
    try {
      const payload = this.jwt.verify(token);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      (req as any).user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('JWT invalide ou expiré');
    }
  }
}

// Type léger pour éviter d'importer trop de dépendances.
