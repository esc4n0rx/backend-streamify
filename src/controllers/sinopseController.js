import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const TMDB_API_KEY = process.env.TMDB_API_KEY;

export const buscarSinopse = async (req, res) => {
  const { nome } = req.query;
  console.log('🔍 [Sinopse] Requisição iniciada');
  console.log(`📥 [Sinopse] Parâmetro recebido: nome="${nome}"`);

  if (!nome) {
    console.warn('⚠ [Sinopse] Parâmetro "nome" não fornecido');
    return res.status(400).json({ erro: 'Parâmetro "nome" obrigatório.' });
  }

  try {
    console.log('🧠 [Sinopse] Consultando conteúdos no Supabase...');
    const { data: existentes, error: erroConsulta } = await supabase
      .from('streamhivex_conteudos')
      .select('id, nome, sinopse, subcategoria')
      .ilike('nome', `%${nome}%`);

    if (erroConsulta) {
      console.error('❌ [Sinopse] Erro ao consultar banco de dados:', erroConsulta.message);
      return res.status(500).json({ erro: 'Erro ao consultar banco de dados.' });
    }

    console.log(`📊 [Sinopse] Resultados encontrados no banco: ${existentes.length}`);

    const encontrado = existentes.find(c =>
      c.sinopse && c.sinopse.trim() !== '' &&
      c.sinopse !== 'Descrição Genérica' &&
      c.sinopse !== 'Descrição não fornecida'
    );

    if (encontrado) {
      console.log(`✅ [Sinopse] Sinopse já existente encontrada para "${encontrado.nome}"`);
      return res.json({ nome: encontrado.nome, sinopse: encontrado.sinopse });
    }

    // Buscar no TMDB
    const tipoBusca = existentes.length > 0 && existentes[0].subcategoria === 'Serie' ? 'tv' : 'movie';
    console.log(`🌐 [Sinopse] Sinopse não encontrada localmente. Consultando TMDB (${tipoBusca})...`);

    const busca = await axios.get(`https://api.themoviedb.org/3/search/${tipoBusca}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        query: nome
      }
    });

    if (!busca.data.results || busca.data.results.length === 0) {
      console.warn('⚠ [Sinopse] Nenhum resultado retornado pelo TMDB');
      return res.json({ nome, sinopse: 'Descrição não fornecida' });
    }

    const idTMDB = busca.data.results[0].id;
    console.log(`🔎 [Sinopse] Resultado TMDB encontrado - ID: ${idTMDB}`);

    const detalhe = await axios.get(`https://api.themoviedb.org/3/${tipoBusca}/${idTMDB}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    const novaSinopse = detalhe.data?.overview?.trim() || 'Descrição não fornecida';
    console.log(`📝 [Sinopse] Sinopse retornada pelo TMDB: "${novaSinopse}"`);

    // Atualizar no banco se existia conteúdo
    if (existentes.length > 0) {
      console.log(`💾 [Sinopse] Atualizando sinopse para ${existentes.length} registros no Supabase...`);
    
      for (const item of existentes) {
        const { error: erroUpdate } = await supabase
          .from('streamhivex_conteudos')
          .update({ sinopse: novaSinopse })
          .eq('id', item.id);
    
        if (erroUpdate) {
          console.error(`❌ [Sinopse] Erro ao atualizar sinopse para ID ${item.id}:`, erroUpdate.message);
        } else {
          console.log(`✅ [Sinopse] Atualização feita para ID ${item.id}`);
        }
      }
    }

    return res.json({ nome, sinopse: novaSinopse });

  } catch (err) {
    console.error('❌ [Sinopse] Erro inesperado durante a requisição:', err.message);
    return res.json({ nome, sinopse: 'Descrição não fornecida' });
  }
};
