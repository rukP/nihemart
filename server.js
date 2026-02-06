(async () => {
  const { createServer } = await import('http');
  const { parse } = await import('url');
  const next = await import('next');
  const { join } = await import('path');
  const { existsSync, statSync } = await import('fs');

  const port = parseInt(process.env.PORT || '3000', 10);
  const dev = process.env.NODE_ENV !== 'production';
  const hostname =
    process.env.HOST ||
    (process.env.NODE_ENV !== 'production' ? 'localhost' : '0.0.0.0');

  // Don't pass hostname and port to Next.js - let it handle routing internally
  // This ensures Next.js can properly serve static files
  const app = next.default({
    dev,
    // Ensure custom server works correctly
    conf: {
      // Disable any optimizations that might interfere
      compress: true,
    },
  });
  const handle = app.getRequestHandler();

  app
    .prepare()
    .then(() => {
      const server = createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url || '/', true);
          const pathname = parsedUrl.pathname || '/';

          // Log chunk requests for debugging
          if (pathname.startsWith('/_next/static/')) {
            console.log(`[Static] Requesting: ${pathname}`);

            // Verify file exists (for debugging)
            if (!dev) {
              const filePath = join(process.cwd(), '.next', pathname);
              if (existsSync(filePath)) {
                console.log(`[Static] File exists: ${filePath}`);
              } else {
                console.error(`[Static] File NOT found: ${filePath}`);
              }
            }
          }

          // Let Next.js handle all requests naturally, including static files
          await handle(req, res, parsedUrl);
        } catch (error) {
          console.error('Error handling request:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        }
      });

      server.listen(port, hostname, () => {
        console.log(
          `> Server listening at http://${hostname}:${port} as ${
            dev ? 'development' : process.env.NODE_ENV
          }`
        );
      });

      server.on('error', error => {
        console.error('Server error:', error);
        process.exit(1);
      });
    })
    .catch(error => {
      console.error('Failed to prepare Next.js app:', error);
      process.exit(1);
    });
})();
