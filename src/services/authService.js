import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';



export const listAvatars = () => {
    try {
      const perfilPath = path.resolve('assets/perfil');
      const perfixPath = path.resolve('assets/perfix');
  
      const perfilAvatars = fs.readdirSync(perfilPath).filter(file => file.endsWith('.png'));
      const perfixAvatars = fs.readdirSync(perfixPath).filter(file => file.endsWith('.png'));
  
      return {
        status: 200,
        data: {
          perfil: perfilAvatars,
          perfix: perfixAvatars
        }
      };
    } catch (err) {
      return { status: 500, error: 'Erro ao listar os avatares' };
    }
  };


  export const loginSocial = async ({ nome, email }) => {
    try {
      // Verifica se já existe usuário com esse email
      const { data: user, error: userError } = await supabase
        .from('streamify_profile')
        .select('*')
        .eq('email', email)
        .single();
  
      let userData = user;
  
      // Se não existir, criar novo
      if (!userData) {
        const { data: newUser, error: createError } = await supabase
          .from('streamify_profile')
          .insert([{ nome, email }])
          .select()
          .single();
  
        if (createError) return { status: 400, error: createError.message };
        userData = newUser;
      }
  
      // Gera token JWT
      const token = jwt.sign(
        { id: userData.id, email: userData.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
  
      return { status: 200, message: 'Login social bem-sucedido', user: userData, token };
    } catch (err) {
      return { status: 500, error: 'Erro interno no login social' };
    }
  };
  


  
  export const register = async ({ nome, email, senha }) => {
    try {
      const senhaCriptografada = await bcrypt.hash(senha, 10);
  
      const { data, error } = await supabase
        .from('streamify_profile')
        .insert([{ nome, email, senha: senhaCriptografada }])
        .select()
        .single();
  
      if (error) return { status: 400, error: error.message };
  
      // Remover senha antes de retornar
      const { senha: _, ...usuarioSemSenha } = data;
  
      return { status: 201, message: 'Usuário registrado com sucesso', data: usuarioSemSenha };
    } catch (err) {
      return { status: 500, error: 'Erro interno ao registrar usuário' };
    }
  };
  

export const login = async ({ email, senha }) => {
  try {
    const { data: user, error } = await supabase
      .from('streamify_profile')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return { status: 404, error: 'Usuário não encontrado' };

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return { status: 401, error: 'Senha incorreta' };

    // 🔐 Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { status: 200, message: 'Login bem-sucedido', user: { ...user, senha: undefined }, token };
  } catch (err) {
    return { status: 500, error: 'Erro interno ao fazer login' };
  }
};


export const updateProfile = async (id, updates) => {
  try {
    if (updates.senha) {
      updates.senha = await bcrypt.hash(updates.senha, 10);
    }

    const { data, error } = await supabase
      .from('streamify_profile')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return { status: 400, error: error.message };

    const { senha: _, ...usuarioSemSenha } = data;

    return { status: 200, message: 'Perfil atualizado com sucesso', data: usuarioSemSenha };
  } catch (err) {
    return { status: 500, error: 'Erro interno ao atualizar perfil' };
  }
};
