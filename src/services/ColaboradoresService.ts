// src/services/colaboradoresService.ts
import { supabase } from '../lib/supabaseClient';
import { Colaborador, Pantalla, Producto } from '../types';

export const colaboradoresService = {

  async getAll(): Promise<Colaborador[]> {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*, pantallas(*), productos(*)');
    if (error) throw error;
    return data ?? [];
  },

  async crear(
    colaborador: Omit<Colaborador, 'id'>,
    pantallas: Omit<Pantalla, 'id' | 'colaboradorId'>[],
    productos: Omit<Producto, 'id' | 'colaboradorId'>[]
  ): Promise<Colaborador> {
    const { data, error } = await supabase
      .from('colaboradores')
      .insert(colaborador)
      .select()
      .single();
    if (error) throw error;

    if (pantallas.length > 0) {
      const { error: ep } = await supabase
        .from('pantallas')
        .insert(pantallas.map(p => ({ ...p, colaborador_id: data.id })));
      if (ep) throw ep;
    }

    if (productos.length > 0) {
      const { error: epr } = await supabase
        .from('productos')
        .insert(productos.map(p => ({ ...p, colaborador_id: data.id })));
      if (epr) throw epr;
    }

    return data;
  },

  async actualizar(
    id: string,
    colaborador: Partial<Colaborador>,
    pantallas?: Omit<Pantalla, 'id'>[],
    productos?: Omit<Producto, 'id'>[]
  ): Promise<void> {
    const { error } = await supabase
      .from('colaboradores')
      .update(colaborador)
      .eq('id', id);
    if (error) throw error;

    // Estrategia delete-and-reinsert para relaciones
    if (pantallas !== undefined) {
      await supabase.from('pantallas').delete().eq('colaborador_id', id);
      if (pantallas.length > 0)
        await supabase.from('pantallas')
          .insert(pantallas.map(p => ({ ...p, colaborador_id: id })));
    }

    if (productos !== undefined) {
      await supabase.from('productos').delete().eq('colaborador_id', id);
      if (productos.length > 0)
        await supabase.from('productos')
          .insert(productos.map(p => ({ ...p, colaborador_id: id })));
    }
  },

  async eliminar(id: string): Promise<void> {
    const { error } = await supabase
      .from('colaboradores')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
