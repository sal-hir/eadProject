// @vitest-environment node
import http from 'node:http';
import { expect, it } from 'vitest';
import { createServer } from 'vite';
import config from '../vite.config';

it('proxies notification SSE without waiting for the stream to end', async () => {
  let receivedPath;
  const upstream = http.createServer((request, response) => {
    receivedPath = request.url;
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    response.write('data: {"type":"PARCEL_NOTIFICATION"}\n\n');
  });
  let vite;
  const abort = new AbortController();
  try {
    await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
    vite = await createServer({
      configFile: false,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1', port: 0,
        proxy: { '/notifications-api': {
          ...config.server.proxy['/notifications-api'],
          target: `http://127.0.0.1:${upstream.address().port}`,
        } },
      },
    });
    await vite.listen();
    const response = await fetch(`http://127.0.0.1:${vite.httpServer.address().port}/notifications-api/api/v1/notifications/stream`, { signal: abort.signal });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const chunk = await response.body.getReader().read();
    expect(new TextDecoder().decode(chunk.value)).toContain('PARCEL_NOTIFICATION');
    expect(receivedPath).toBe('/api/v1/notifications/stream');
  } finally {
    abort.abort();
    upstream.closeAllConnections();
    await vite?.close();
    await new Promise(resolve => upstream.close(resolve));
  }
}, 15000);
