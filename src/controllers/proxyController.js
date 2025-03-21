import http from 'http';
import https from 'https';

const allowedProtocols = ['http:', 'https:'];
const MAX_REDIRECTS = 5;

const handleRequest = (videoUrl, options, redirCount = 0) => {
  return new Promise((resolve, reject) => {
    console.log(`handleRequest: Iniciando requisição para ${videoUrl} (redirecionamento: ${redirCount})`);
    const parsed = new URL(videoUrl);
    const client = parsed.protocol === 'http:' ? http : https;

    // Atualiza os headers para refletir a URL atual (em caso de redirecionamento)
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        Referer: parsed.origin,
        Origin: parsed.origin,
      },
    };

    const req = client.request(videoUrl, requestOptions, (res) => {
      console.log(`handleRequest: Resposta recebida para ${videoUrl} com status ${res.statusCode}`);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirCount >= MAX_REDIRECTS) {
          console.error('handleRequest: Número máximo de redirecionamentos atingido.');
          return reject(new Error('Número máximo de redirecionamentos atingido.'));
        }
        const redirectUrl = new URL(res.headers.location, videoUrl).href;
        console.log(`handleRequest: Redirecionamento para ${redirectUrl}`);
        handleRequest(redirectUrl, options, redirCount + 1)
          .then(resolve)
          .catch(reject);
      } else {
        resolve(res);
      }
    });

    req.on('error', (err) => {
      console.error(`handleRequest: Erro na requisição para ${videoUrl}: ${err.message}`);
      reject(err);
    });
    req.end();
  });
};

function getBaseUrl(urlString) {
  const parsed = new URL(urlString);
  const pathParts = parsed.pathname.split('/');
  pathParts.pop();
  const pathWithoutFile = pathParts.join('/');
  return `${parsed.protocol}//${parsed.host}${pathWithoutFile}/`;
}

export const proxyVideo = (req, res) => {
  console.log(`proxyVideo: Requisição recebida com query ${JSON.stringify(req.query)}`);
  const videoUrl = req.query.url;

  if (!videoUrl) {
    console.error("proxyVideo: Parâmetro 'url' não informado.");
    return res.status(400).json({ message: "Parâmetro 'url' é obrigatório." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(videoUrl);
  } catch (err) {
    console.error(`proxyVideo: URL inválida: ${videoUrl}`);
    return res.status(400).json({ message: 'URL inválida.' });
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    console.error(`proxyVideo: Protocolo não permitido: ${parsedUrl.protocol}`);
    return res.status(400).json({ message: 'Protocolo não permitido.' });
  }

  // Clona os cabeçalhos da requisição original, removendo os que podem causar conflitos
  const headersToForward = { ...req.headers };
  delete headersToForward.host;
  delete headersToForward['content-length'];

  // Sobrescreve alguns headers para padronização e segurança
  headersToForward['User-Agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36';
  headersToForward.Referer = parsedUrl.origin;
  headersToForward.Origin = parsedUrl.origin;

  const options = {
    method: req.method,
    headers: headersToForward,
  };

  console.log(`proxyVideo: Iniciando requisição proxy para ${videoUrl}`);
  handleRequest(videoUrl, options)
    .then((finalRes) => {
      console.log(`proxyVideo: Resposta final recebida com status ${finalRes.statusCode}`);
      // Define os headers CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

      const contentType = finalRes.headers['content-type'] || '';
      if (
        contentType.includes('application/vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegURL') ||
        videoUrl.endsWith('.m3u8') ||
        contentType.includes('application/dash+xml') ||
        videoUrl.endsWith('.mpd')
      ) {
        console.log(`proxyVideo: Conteúdo do manifest identificado (${contentType}). Reescrevendo URLs internas.`);
        let data = '';
        finalRes.setEncoding('utf8');
        finalRes.on('data', (chunk) => {
          data += chunk;
        });
        finalRes.on('end', () => {
          const proxyBaseUrl = `https://${req.get('host')}/api/proxy?url=`;
          const rewritten = data.replace(/https?:\/\/[^\r\n'"]+/g, (match) => {
            const proxiedUrl = `${proxyBaseUrl}${encodeURIComponent(match)}`;
            console.log(`proxyVideo: Reescrevendo URL: ${match} para ${proxiedUrl}`);
            return proxiedUrl;
          });

          const headers = { ...finalRes.headers };
          delete headers['content-length'];
          res.writeHead(finalRes.statusCode, headers);
          res.end(rewritten);
          console.log('proxyVideo: Resposta do manifest enviada com sucesso.');
        });
      } else {
        console.log(`proxyVideo: Conteúdo não é manifest. Encaminhando resposta diretamente.`);
        res.writeHead(finalRes.statusCode, finalRes.headers);
        finalRes.pipe(res);
      }
    })
    .catch((err) => {
      console.error(`proxyVideo: Erro ao buscar o recurso ${videoUrl}: ${err.message}`);
      res.status(500).json({ message: 'Erro ao buscar o recurso.', error: err.message, url: videoUrl });
    });
};
