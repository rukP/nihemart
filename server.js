(async () => {
  const { createServer } = await import('http');
  const { parse } = await import('url');
  const next = await import('next');

  const port = parseInt(process.env.PORT || '3000', 10);
  const dev = process.env.NODE_ENV !== 'production';
  const hostname = process.env.NODE_ENV !== 'production' ? 'localhost' : 'nihemart.rw';
  const app = next.default({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, () => {
      console.log(
        `> Server listening at http://${hostname}:${port} as ${
          dev ? 'development' : process.env.NODE_ENV
        }`
      );
    });
  });
})();