import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../common/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../common/auth/guards/jwt-auth.guard';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  telephone!: string;

  @IsString()
  @IsNotEmpty()
  motDePasse!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Login admin/vendeur.
   * Le mot de passe est vérifié par Supabase Auth serveur (anonyme→session) ;
   * le rôle est lu dans la table `User` (service_role). Le frontend reçoit un
   * JWT signé par le backend — il ne gère jamais la clé.
   */
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    return this.auth.login(body.telephone, body.motDePasse);
  }

  /** Renvoie l'utilisateur courant décodé du JWT. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: unknown }) {
    return { user: req.user };
  }
}
