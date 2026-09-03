import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './common/core.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/auth/guards/roles.guard';

@Module({
  imports: [CoreModule, AuthModule, OrdersModule, ProductsModule, ReviewsModule],
  // Guards globaux : l'accès repose sur le JWT serveur, jamais sur le localStorage.
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
