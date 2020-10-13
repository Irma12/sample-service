const express = require('express');
const Sentry = require('@sentry/node');
const Rollbar = require('rollbar');
const get = require('lodash/get');
const winston = require('winston');
const expressWinston = require('express-winston');
const newrelic = require('newrelic');

const app = express();

Sentry.init({ dsn: process.env.SENTRY_INGESTION_URL });

const logger = expressWinston.logger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'sample-service' },
  transports: [
    new winston.transports.Console(),
  ],
});

app.use(logger);
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true
});

// All controllers should live here
app.get('/', function rootHandler(req, res) {
  res.json({
    message: 'Hello world!',
  });
});

app.post('/debug-sentry', function mainHandler(req) {
  const errorMsg = get(req, 'body.errorMessage', 'My first Sentry error!');

  throw new Error(errorMsg);
});

app.post('/debug-rollbar', function mainHandler(req, res) {
  const errorMsg = get(req, 'body.errorMessage', 'My first Rollbar error!');
  rollbar.error(errorMsg);

  res.json({
    message: `Error sent to Rollbar: "${errorMsg}"`,
  });
});

app.post('/debug-newrelic', function mainHandler(req, res) {
  const key = get(req, 'body.customAttributeKey', 'test-attribute-key');
  const value = get(req, 'body.customAttributeValue', 'test-attribute-value');
  newrelic.addCustomAttribute(key, value);

  res.json({
    message: `Custom attribute sent to newrelic.`,
    data: {
      customAttributeKey: key,
      customAttributeValue: value,
    },
  });
});

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

module.exports = {
  app,
};
