import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

export const criarPerfil = async ({ usuario_id, nome, avatar, pin }) => {
  try {
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;
    const { data, error } = await supabase
      .from('streamify_perfis')
      .insert([{ usuario_id, nome, avatar, pin: pinHash }])
      .select()
      .single();

    if (error) return { status: 400, error: error.message };
    return { status: 201, message: 'Perfil criado com sucesso', data };
  } catch (err) {
    return { status: 500, error: 'Erro ao criar perfil' };
  }
};

export const listarPerfis = async (usuario_id) => {
  try {
    const { data: perfis, error } = await supabase
      .from('streamify_perfis')
      .select('id, nome, avatar, criado_em')
      .eq('usuario_id', usuario_id);

    if (error) return { status: 400, error: error.message };

    // ⚠ Se não houver perfis, criar o default
    if (!perfis || perfis.length === 0) {
      // Buscar nome do usuário dono
      const { data: usuario, error: erroUsuario } = await supabase
        .from('streamify_profile')
        .select('nome')
        .eq('id', usuario_id)
        .single();

      if (erroUsuario || !usuario) {
        return { status: 500, error: 'Erro ao buscar nome do usuário para perfil padrão.' };
      }

      const perfilDefault = {
        usuario_id,
        nome: usuario.nome || 'Perfil Padrão',
        avatar: '/assets/perfil/default.png',
        pin: null
      };

      const { data: novoPerfil, error: erroInsert } = await supabase
        .from('streamify_perfis')
        .insert([perfilDefault])
        .select();

      if (erroInsert) {
        return { status: 500, error: 'Erro ao criar perfil padrão automaticamente.' };
      }

      console.log(`🆕 Perfil padrão criado automaticamente para o usuário "${usuario.nome}"`);

      return { status: 200, data: novoPerfil };
    }

    return { status: 200, data: perfis };
  } catch (err) {
    return { status: 500, error: 'Erro ao listar perfis' };
  }
};
export const removerPerfil = async (usuario_id, perfil_id) => {
  try {
    const { error } = await supabase
      .from('streamify_perfis')
      .delete()
      .eq('id', perfil_id)
      .eq('usuario_id', usuario_id); // só o dono pode remover

    if (error) return { status: 400, error: error.message };
    return { status: 200, message: 'Perfil removido com sucesso' };
  } catch (err) {
    return { status: 500, error: 'Erro ao remover perfil' };
  }
};

export const validarPin = async (perfil_id, pin) => {
  try {
    const { data: perfil, error } = await supabase
      .from('streamify_perfis')
      .select('pin')
      .eq('id', perfil_id)
      .single();

    if (error) return { status: 404, error: 'Perfil não encontrado' };
    if (!perfil.pin) return { status: 200, acesso: true }; // sem pin

    const valido = await bcrypt.compare(pin, perfil.pin);
    return { status: valido ? 200 : 401, acesso: valido };
  } catch (err) {
    return { status: 500, error: 'Erro ao validar PIN' };
  }
};
