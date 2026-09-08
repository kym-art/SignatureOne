import { Module, ValidationPipe } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './common/core.module';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/auth/guards/roles.guard';

@Module({
  imports: [CoreModule, AuthModule, OrdersModule, ProductsModule, ReviewsModule],
  // Guards globaux : l'accès repose sur le JWT serveur, jamais sur le localStorage.
  // ValidationPipe global : validation runtime de TOUS les body des routes
  // (les DTOs sont des classes avec décorateurs class-validator).
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // ignore les champs inconnus (ex. prixUnitaire client)
        transform: true, // transforme les DTOs imbriqués (Type(() => ...))
        forbidNonWhitelisted: false,
      }),
    },
  ],
})
export class AppModule {}
