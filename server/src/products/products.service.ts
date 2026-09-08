import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { Product } from '../types';

@Injectable()
export class ProductsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Catalogue public : seuls les produits actifs. */
  async findAll(): Promise<Product[]> {
    const { data, error } = await this.supabase.admin
      .from('Product')
      .select('*')
      .eq('actif', true)
      .order('createdAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as Product[];
  }

  async findOne(id: string): Promise<Product> {
    const { data, error } = await this.supabase.admin.from('Product').select('*').eq('id', id).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Produit introuvable');
    return data as Product;
  }

  async create(body: CreateProductDto): Promise<Product> {
    // Le schéma Prisma définit id via @default(cuid()) — un défaut APPLICATIF
    // (généré par le client Prisma) et non SQL. Or ce service écrit via le
    // client REST Supabase : sans id explicite, PostgREST rejette l'insert
    // (« null value in column "id" »). Même pattern que OrdersService (ord_/it_).
    const payload = {
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...body,
    };
    const { data, error } = await this.supabase.admin
      .from('Product')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as Product;
  }

  async update(id: string, body: UpdateProductDto): Promise<Product> {
    // Evite d'envoyer des clés undefined (PostgREST les rejette parfois).
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) clean[k] = v;
    }
    const { data, error } = await this.supabase.admin
      .from('Product')
      .update(clean)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new NotFoundException(error.message);
    return data as Product;
  }

  async remove(id: string): Promise<{ softDeleted: boolean }> {
    // ⚠️ Si le produit est référencé par des OrderItem, on ne le SUPPRIME pas
    // (les commandes passées doivent rester cohérentes) : soft-delete
    // (actif=false + disponible=false) pour le retirer du catalogue.
    const { data: refs, error: refErr } = await this.supabase.admin
      .from('OrderItem')
      .select('id')
      .eq('productId', id)
      .limit(1);
    if (refErr) throw new BadRequestException(refErr.message);

    if (refs && refs.length > 0) {
      const { error } = await this.supabase.admin
        .from('Product')
        .update({ actif: false, disponible: false })
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);
      return { softDeleted: true };
    }

    const { error } = await this.supabase.admin.from('Product').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { softDeleted: false };
  }
}
