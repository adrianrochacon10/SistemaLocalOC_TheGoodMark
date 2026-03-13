// src/hooks/useColaboradores.ts
import { useState, useEffect, useCallback } from 'react';
import { colaboradoresService } from '../services/ColaboradoresService';
import { Colaborador, Pantalla, Producto } from '../types';

export function useColaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await colaboradoresService.getAll();
      setColaboradores(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (
    colaborador: Omit<Colaborador, 'id'>,
    pantallas: Omit<Pantalla, 'id' | 'colaboradorId'>[],
    productos: Omit<Producto, 'id' | 'colaboradorId'>[]
  ) => {
    await colaboradoresService.crear(colaborador, pantallas, productos);
    await cargar(); // refresca lista
  };

  const actualizar = async (
    id: string,
    colaborador: Partial<Colaborador>,
    pantallas?: Omit<Pantalla, 'id'>[],
    productos?: Omit<Producto, 'id'>[]
  ) => {
    await colaboradoresService.actualizar(id, colaborador, pantallas, productos);
    await cargar();
  };

  const eliminar = async (id: string) => {
    await colaboradoresService.eliminar(id);
    setColaboradores(prev => prev.filter(c => c.id !== id)); // optimistic update
  };

  return { colaboradores, cargando, error, guardar, actualizar, eliminar };
}
