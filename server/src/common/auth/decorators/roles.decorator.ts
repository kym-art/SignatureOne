import { SetMetadata } from '@nestjs/common';

/** Exige un ou plusieurs rôles (ex. Roles('ADMIN','VENDEUR')). */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
