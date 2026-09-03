import { Injectable } from '@nestjs/common';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../../config/configuration';

export interface JwtUserPayload {
  sub: string;
  telephone: string;
  role: string;
  nom: string;
}

@Injectable()
export class JwtService {
  /** Secret obligatoire : jamais de valeur par défaut prévisible (fail-closed). */
  private secret(): string {
    const secret = config.jwtSecret;
    if (!secret) {
      throw new Error(
        'JWT_SECRET manquant : refus de signer/vérifier les tokens. Définissez JWT_SECRET dans .env.'
      );
    }
    return secret;
  }

  sign(payload: JwtUserPayload, expiresIn: SignOptions['expiresIn'] = '7d'): string {
    return jwt.sign(payload, this.secret(), { expiresIn });
  }

  verify(token: string): JwtUserPayload {
    const decoded = jwt.verify(token, this.secret()) as JwtPayload & JwtUserPayload;
    if (!decoded.sub || !decoded.role) {
      throw new Error('Invalid JWT payload');
    }
    return {
      sub: decoded.sub,
      telephone: decoded.telephone ?? '',
      role: decoded.role,
      nom: decoded.nom ?? '',
    };
  }
}
