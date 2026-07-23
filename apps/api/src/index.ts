import { buildApp } from './app';
import { config } from './config';

buildApp()
  .then((app) => app.listen({ port: config.port, host: '0.0.0.0' }))
  .then((address) => {
    console.log(`Plank API запущен на ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
