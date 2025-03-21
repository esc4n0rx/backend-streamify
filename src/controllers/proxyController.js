import http from 'http';
import https from 'https';

const allowedProtocols = ['http:', 'https:'];
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 30000; // 30 seconds timeout

/**
 * Handles HTTP/HTTPS requests with support for redirects
 * @param {string} videoUrl - URL to fetch
 * @param {object} options - Request options
 * @param {number} redirCount - Current redirect count
 * @returns {Promise<http.IncomingMessage>}
 */
const handleRequest = (videoUrl, options, redirCount = 0) => {
  return new Promise((resolve, reject) => {
    console.log(`[handleRequest] Iniciando requisição para ${videoUrl} (redirecionamento: ${redirCount})`);
    
    let parsed;
    try {
      parsed = new URL(videoUrl);
    } catch (error) {
      console.error(`[handleRequest] URL inválida: ${videoUrl}`);
      return reject(new Error(`URL inválida: ${videoUrl}`));
    }
    
    const client = parsed.protocol === 'http:' ? http : https;
    
    // Atualiza os headers para refletir a URL atual
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        Referer: parsed.origin,
        Origin: parsed.origin,
      },
    };
    
    // Log request headers for debugging
    console.log(`[handleRequest] Headers da requisição: ${JSON.stringify(requestOptions.headers, null, 2)}`);
    
    const req = client.request(videoUrl, requestOptions, (res) => {
      console.log(`[handleRequest] Resposta recebida para ${videoUrl} com status ${res.statusCode}`);
      console.log(`[handleRequest] Headers da resposta: ${JSON.stringify(res.headers, null, 2)}`);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirCount >= MAX_REDIRECTS) {
          console.error('[handleRequest] Número máximo de redirecionamentos atingido.');
          return reject(new Error('Número máximo de redirecionamentos atingido.'));
        }
        
        const redirectUrl = new URL(res.headers.location, videoUrl).href;
        console.log(`[handleRequest] Redirecionamento para ${redirectUrl}`);
        
        handleRequest(redirectUrl, options, redirCount + 1)
          .then(resolve)
          .catch(reject);
      } else {
        // Check for range support
        if (res.headers['accept-ranges']) {
          console.log(`[handleRequest] Servidor suporta ranges: ${res.headers['accept-ranges']}`);
        }
        
        // Check for content range
        if (res.headers['content-range']) {
          console.log(`[handleRequest] Content-Range: ${res.headers['content-range']}`);
        }
        
        resolve(res);
      }
    });
    
    // Set timeout
    req.setTimeout(TIMEOUT_MS, () => {
      console.error(`[handleRequest] Timeout na requisição para ${videoUrl} após ${TIMEOUT_MS}ms`);
      req.destroy();
      reject(new Error(`Timeout na requisição após ${TIMEOUT_MS}ms`));
    });
    
    // Handle request errors
    req.on('error', (err) => {
      console.error(`[handleRequest] Erro na requisição para ${videoUrl}: ${err.message}`);
      reject(err);
    });
    
    req.end();
  });
};

/**
 * Extract base URL from a complete URL
 * @param {string} urlString - Full URL
 * @returns {string} Base URL
 */
function getBaseUrl(urlString) {
  const parsed = new URL(urlString);
  const pathParts = parsed.pathname.split('/');
  pathParts.pop();
  const pathWithoutFile = pathParts.join('/');
  return `${parsed.protocol}//${parsed.host}${pathWithoutFile}/`;
}

/**
 * Determines if the content is a video file
 * @param {string} contentType - Content-Type header
 * @param {string} url - Resource URL
 * @returns {boolean}
 */
function isVideoContent(contentType, url) {
  // Check common video content types
  if (contentType.includes('video/')) {
    return true;
  }
  
  // Check by extension
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
}

/**
 * Determines if the content is a manifest file
 * @param {string} contentType - Content-Type header
 * @param {string} url - Resource URL
 * @returns {boolean}
 */
function isManifestContent(contentType, url) {
  return (
    contentType.includes('application/vnd.apple.mpegurl') ||
    contentType.includes('application/x-mpegURL') ||
    url.endsWith('.m3u8') ||
    contentType.includes('application/dash+xml') ||
    url.endsWith('.mpd')
  );
}

/**
 * Main proxy handler function
 * @param {object} req - HTTP request
 * @param {object} res - HTTP response
 */
export const proxyVideo = (req, res) => {
  console.log(`[proxyVideo] Requisição recebida: ${req.method} ${req.url}`);
  console.log(`[proxyVideo] Query params: ${JSON.stringify(req.query)}`);
  
  const videoUrl = req.query.url;
  
  if (!videoUrl) {
    console.error("[proxyVideo] Parâmetro 'url' não informado.");
    return res.status(400).json({ message: "Parâmetro 'url' é obrigatório." });
  }
  
  // Parse and validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(videoUrl);
    console.log(`[proxyVideo] URL parsada: protocolo=${parsedUrl.protocol}, host=${parsedUrl.host}, pathname=${parsedUrl.pathname}`);
  } catch (err) {
    console.error(`[proxyVideo] URL inválida: ${videoUrl}`);
    return res.status(400).json({ message: 'URL inválida.' });
  }
  
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    console.error(`[proxyVideo] Protocolo não permitido: ${parsedUrl.protocol}`);
    return res.status(400).json({ message: 'Protocolo não permitido.' });
  }
  
  // Clone headers and clean up ones that might cause issues
  const headersToForward = { ...req.headers };
  delete headersToForward.host;
  delete headersToForward['content-length'];
  
  // Forward Range header if present (important for video streaming)
  if (req.headers.range) {
    console.log(`[proxyVideo] Range header detectado: ${req.headers.range}`);
  }
  
  // Set standard headers
  headersToForward['User-Agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36';
  headersToForward.Referer = parsedUrl.origin;
  headersToForward.Origin = parsedUrl.origin;
  
  const options = {
    method: req.method,
    headers: headersToForward,
  };
  
  console.log(`[proxyVideo] Iniciando requisição proxy para ${videoUrl}`);
  
  handleRequest(videoUrl, options)
    .then((finalRes) => {
      console.log(`[proxyVideo] Resposta final recebida com status ${finalRes.statusCode}`);
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
      
      // Always set this for video content
      res.setHeader('Accept-Ranges', 'bytes');
      
      const contentType = finalRes.headers['content-type'] || '';
      console.log(`[proxyVideo] Content-Type: "${contentType}"`);
      
      // Process manifest files (m3u8, mpd) or video files that need URL rewriting
      if (isManifestContent(contentType, videoUrl)) {
        console.log(`[proxyVideo] Conteúdo do manifest identificado (${contentType}). Reescrevendo URLs internas.`);
        
        let data = '';
        finalRes.setEncoding('utf8');
        
        finalRes.on('data', (chunk) => {
          data += chunk;
        });
        
        finalRes.on('end', () => {
          console.log(`[proxyVideo] Manifest recebido. Tamanho: ${data.length} bytes`);
          
          const proxyBaseUrl = `https://${req.get('host')}/api/proxy?url=`;
          
          // Find and rewrite all URLs in the manifest
          const rewritten = data.replace(/https?:\/\/[^\r\n'"]+/g, (match) => {
            const proxiedUrl = `${proxyBaseUrl}${encodeURIComponent(match)}`;
            console.log(`[proxyVideo] Reescrevendo URL: ${match} para ${proxiedUrl}`);
            return proxiedUrl;
          });
          
          const headers = { ...finalRes.headers };
          // Remove content-length as we modified the content
          delete headers['content-length'];
          
          res.writeHead(finalRes.statusCode, headers);
          res.end(rewritten);
          console.log('[proxyVideo] Resposta do manifest enviada com sucesso.');
        });
      } 
      // Handle video content specifically
      else if (isVideoContent(contentType, videoUrl)) {
        console.log(`[proxyVideo] Conteúdo de vídeo detectado: ${contentType}`);
        
        // Forward important headers for video streaming
        const headers = { ...finalRes.headers };
        
        // Ensure streaming headers are set
        if (finalRes.headers['content-range']) {
          res.setHeader('Content-Range', finalRes.headers['content-range']);
        }
        
        if (finalRes.headers['content-length']) {
          res.setHeader('Content-Length', finalRes.headers['content-length']);
        }
        
        console.log(`[proxyVideo] Encaminhando vídeo com headers: ${JSON.stringify(headers, null, 2)}`);
        res.writeHead(finalRes.statusCode, headers);
        finalRes.pipe(res);
      } 
      // Handle all other content types
      else {
        console.log(`[proxyVideo] Conteúdo não é manifest nem vídeo. Encaminhando resposta diretamente.`);
        res.writeHead(finalRes.statusCode, finalRes.headers);
        finalRes.pipe(res);
      }
    })
    .catch((err) => {
      console.error(`[proxyVideo] Erro ao buscar o recurso ${videoUrl}: ${err.message}`);
      res.status(500).json({ 
        message: 'Erro ao buscar o recurso.', 
        error: err.message, 
        url: videoUrl,
        stack: err.stack 
      });
    });
};
