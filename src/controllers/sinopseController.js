import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const TMDB_API_KEY = process.env.TMDB_API_KEY;

export const buscarSinopse = async (req, res) => {
  const { nome } = req.query;
  if (!nome) return res.status(400).json({ erro: 'Parâmetro "nome" obrigatório.' });

  const { data: existentes, error: erroConsulta } = await supabase
    .from('streamhivex_conteudos')
    .select('id, nome, sinopse, subcategoria')
    .ilike('nome', `%${nome}%`);

  if (erroConsulta) return res.status(500).json({ erro: 'Erro ao consultar banco de dados.' });

  const encontrado = existentes.find(c => c.sinopse && c.sinopse.trim() !== '' && c.sinopse !== 'Descrição Genérica' && c.sinopse !== 'Descrição não fornecida');
  if (encontrado) return res.json({ nome: encontrado.nome, sinopse: encontrado.sinopse });

  try {
    const tipoBusca = existentes.length > 0 && existentes[0].subcategoria === 'Serie' ? 'tv' : 'movie';
    const busca = await axios.get(`https://api.themoviedb.org/3/search/${tipoBusca}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        query: nome
      }
    });

    if (!busca.data.results || busca.data.results.length === 0) {
      return res.json({ nome, sinopse: 'Descrição não fornecida' });
    }

    const detalhe = await axios.get(`https://api.themoviedb.org/3/${tipoBusca}/${busca.data.results[0].id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    const novaSinopse = detalhe.data?.overview?.trim() || 'Descrição não fornecida';

    if (existentes.length > 0) {
      const isSerie = existentes[0].subcategoria === 'Serie';
      const ids = existentes.map(c => c.id);

      const updates = ids.map(id => ({ id, sinopse: novaSinopse }));
      const { error: erroUpdate } = await supabase.from('streamhivex_conteudos').upsert(updates, { onConflict: 'id' });
      if (erroUpdate) console.error('Erro ao atualizar sinopses:', erroUpdate);
    }

    return res.json({ nome, sinopse: novaSinopse });

  } catch (err) {
    console.error('Erro na API TMDB:', err.message);
    return res.json({ nome, sinopse: 'Descrição não fornecida' });
  }
};