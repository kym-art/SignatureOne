import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
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

  async create(body: Partial<Product>): Promise<Product> {
    const { data, error } = await this.supabase.admin
      .from('Product')
      .insert({ ...body })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as Product;
  }

  async update(id: string, body: Partial<Product>): Promise<Product> {
    const { data, error } = await this.supabase.admin
      .from('Product')
      .update(body)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new NotFoundException(error.message);
    return data as Product;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('Product').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
