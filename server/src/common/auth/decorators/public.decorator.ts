import { SetMetadata } from '@nestjs/common';

/** Marque une route comme publique (sans auth JWT), ex. login / checkout. */
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
