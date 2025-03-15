import { supabase } from '../config/supabase.js';

export const getRecommendations = async (usuario_id) => {
  try {
    // 1. Buscar histórico do usuário (últimos assistidos)
    const { data: historico, error: histError } = await supabase
      .from('streamify_watch_history')
      .select('conteudo_id')
      .eq('usuario_id', usuario_id)
      .order('assistido_em', { ascending: false })
      .limit(50);

    if (histError) return { status: 400, error: histError.message };

    const idsAssistidos = historico.map(h => h.conteudo_id);

    // 2. Buscar conteúdos assistidos para extrair categorias/subcategorias
    const { data: conteudosAssistidos, error: conteudosError } = await supabase
      .from('streamhivex_conteudos')
      .select('categoria, subcategoria, nome')
      .in('id', idsAssistidos);

    if (conteudosError) return { status: 400, error: conteudosError.message };

    const categorias = [...new Set(conteudosAssistidos.map(c => c.categoria))];
    const subcategorias = [...new Set(conteudosAssistidos.map(c => c.subcategoria))];
    const palavrasChave = conteudosAssistidos.flatMap(c => c.nome.split(' ')).map(w => w.toLowerCase());

    // 3. Buscar novos conteúdos com critérios parecidos
    const { data: recomendados, error: recError } = await supabase
      .from('streamhivex_conteudos')
      .select('id, nome, poster, categoria, subcategoria, url')
      .not('id', 'in', `(${idsAssistidos.join(',')})`)
      .or(
        `categoria.in.(${categorias.map(c => `"${c}"`).join(',')}),subcategoria.in.(${subcategorias.map(s => `"${s}"`).join(',')})`
      )
      .limit(300);

    if (recError) return { status: 400, error: recError.message };

    // 4. Ordenar os recomendados pela similaridade de palavras-chave
    const rankeados = recomendados.map(item => {
      const score = palavrasChave.reduce((acc, palavra) => {
        if (item.nome.toLowerCase().includes(palavra)) acc += 1;
        return acc;
      }, 0);
      return { ...item, score };
    });

    // 5. Ordenar e limitar
    const final = rankeados.sort((a, b) => b.score - a.score).slice(0, 100);

    return { status: 200, data: final };
  } catch (err) {
    return { status: 500, error: 'Erro ao gerar recomendações.' };
  }
};
