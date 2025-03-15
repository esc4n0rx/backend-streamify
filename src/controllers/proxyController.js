import http from 'http';
import https from 'https';

const allowedProtocols = ['http:', 'https:'];
const MAX_REDIRECTS = 5;

const handleRequest = (videoUrl, options, redirCount = 0) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(videoUrl);
    const client = parsed.protocol === 'http:' ? http : https;

    const req = client.request(videoUrl, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirCount >= MAX_REDIRECTS) {
          return reject(new Error('Número máximo de redirecionamentos atingido.'));
        }
        const redirectUrl = res.headers.location;
        handleRequest(redirectUrl, options, redirCount + 1)
          .then(resolve)
          .catch(reject);
      } else {
        resolve(res);
      }
    });

    req.on('error', (err) => reject(err));
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
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ message: "Parâmetro 'url' é obrigatório." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(videoUrl);
  } catch (err) {
    return res.status(400).json({ message: 'URL inválida.' });
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return res.status(400).json({ message: 'Protocolo não permitido.' });
  }

  const options = {
    method: req.method,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36',
      Referer: parsedUrl.origin,
      Origin: parsedUrl.origin,
    },
  };

  handleRequest(videoUrl, options)
    .then((finalRes) => {
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
        let data = '';
        finalRes.setEncoding('utf8');
        finalRes.on('data', (chunk) => {
          data += chunk;
        });
        finalRes.on('end', () => {
          const baseUrl = getBaseUrl(videoUrl);
          const proxyBaseUrl = `https://${req.get('host')}/api/proxy?url=`;

          const rewritten = data.replace(/https?:\/\/[^\r\n'"]+/g, (match) => {
            return `${proxyBaseUrl}${encodeURIComponent(match)}`;
          });

          const headers = { ...finalRes.headers };
          delete headers['content-length'];
          res.writeHead(finalRes.statusCode, headers);
          res.end(rewritten);
        });
      } else {
        res.writeHead(finalRes.statusCode, finalRes.headers);
        finalRes.pipe(res);
      }
    })
    .catch((err) => {
      res.status(500).json({ message: 'Erro ao buscar o recurso.', error: err.message, url: videoUrl });
    });
};
