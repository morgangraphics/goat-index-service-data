require('dotenv').load();

const fs = require('fs');
const hapi = require('hapi');
const HapiSwagger = require('hapi-swagger');
const http2 = require('http2');
const Inert = require('inert');
const Vision = require('vision');
const Routes = require('./api/index');

const tls = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
};

const listener = http2.createSecureServer(tls);

// Create a server with a host and port
const server = hapi.server({
  host: '0.0.0.0',
  listener,
  port: 3000,
  router: {
    stripTrailingSlash: true,
  },
  routes: {
    cors: {
      origin: ['https://127.0.0.1:8080'],
      headers: ['Accept', 'Content-Type'],
    },
    payload: {
      allow: ['application/json', 'application/*+json'],
    },
  },
});

const swaggerOptions = {
  info: {
    title: 'Test API Documentation',
    // version: Pack.version,
  },
  schemes: ['https'],
  host: '127.0.0.1:3000',
};


(async () => {
  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions,
    },
  ]);
  try {
    await server.start();
    server.route(Routes);
    console.log(`Server running at: ${server.info.uri}`);
  } catch (err) {
    console.log(err);
  }
})();

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});
