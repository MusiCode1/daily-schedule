/**
 * cors-proxy.mjs
 * פרוקסי פשוט שמוסיף כותרות CORS לכל בקשה.
 *
 * שימוש:
 *   node cors-proxy.mjs <target-url> [port]
 *
 * דוגמה:
 *   node cors-proxy.mjs http://192.168.1.50:2323
 *   node cors-proxy.mjs http://192.168.1.50:2323 8080
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const targetArg = process.argv[2]?? 'http://127.0.0.1/2323';
const proxyPort = parseInt(process.argv[3] ?? '8765', 10);
const hostname = '0.0.0.0';

if (!targetArg) {
  console.error('שגיאה: יש לספק כתובת יעד.');
  console.error('שימוש: node cors-proxy.mjs <target-url> [port]');
  process.exit(1);
}

const targetUrl = new URL(targetArg);
const useHttps = targetUrl.protocol === 'https:';
const agent = useHttps ? https : http;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const server = http.createServer((req, res) => {
  // בקשת preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // בניית כתובת היעד
  const target = new URL(req.url ?? '/', targetUrl);

  const options = {
    hostname: target.hostname,
    port: target.port || (useHttps ? 443 : 80),
    path: target.pathname + target.search,
    method: req.method,
    headers: { ...req.headers, host: target.host },
  };

  const proxyReq = agent.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 200, {
      ...proxyRes.headers,
      ...CORS_HEADERS,
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('שגיאת חיבור:', err.message);
    res.writeHead(502, CORS_HEADERS);
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxyReq);
});

server.listen(proxyPort, hostname, () => {
  console.log(`✅ פרוקסי CORS פועל`);
  console.log(`   האזנה: http://localhost:${proxyPort}`);
  console.log(`   יעד:   ${targetUrl.origin}`);
  console.log(`\nהשתמש בדף הניהול עם הכתובת: http://localhost:${proxyPort}`);
});
