const async = require('async');
const joi = require('joi');
const utils = require('./utils');
const https = require('https');
// const logger = require('./logger');

/**
* @private
* Schema Validation to make sure NEWS_API_KEY is in the environment before doing anything
*/
const _envVarsSchema = joi.object({
  NEWS_API_KEY: joi.string()
    .required(),
}).unknown()
  .required();

const { err, value: envVars } = joi.validate(process.env, _envVarsSchema);
if (err) {
  throw new Error(`Config validation error: ${err.message}`);
}

/**
* @private
* Format needed to grab newsapi.org data via HTTP Request
*/
const _defaults = {
  hostname: 'newsapi.org',
  path: '',
  method: 'GET',
  headers: {
    'X-Api-Key': '',
  },
};
const sourcePath = '/v1/sources';
const articlePath = '/v1/articles';

const responseHeaders = {
  'Content-Type': 'application/json',
  // Required for CORS support to work
  'Access-Control-Allow-Origin': '*',
  // Required for cookies, authorization headers with HTTPS
  'Access-Control-Allow-Credentials': true,
};

/**
 * Helper function that formats error from newsAPI.org call
 * @private
 * @param  {Object} error error object
 * @return {Object}     Pretty Printed/formatted error JSON object
 */
const handleError = error => ({
  statusCode: error.code || 500,
  headers: responseHeaders,
  body: utils.format(error),
});

/**
 * Helper function that returns a Pretty Printed/formatted object
 * @private
 * @param  {Object} [data={}]  JSON object containing array of available sources
 * @param  {Number} [code=200] AJAX status code
 * @return {Object}            Pretty Printed/formatted JSON object
 */
const handleSuccess = (data = {}, code = 200) => ({
  statusCode: code,
  headers: responseHeaders,
  body: utils.format(data),
});

/**
* getSources returns a list of news source ID's
* like : 'abc-news-au', 'al-jazeera-english', 'ars-technica'
* @return {Promise} Promise object represents JSON object of News Sources
*/
const getSources = () => {
  const opts = Object.assign({}, _defaults);
  opts.path = sourcePath;
  opts.headers['X-Api-Key'] = envVars.NEWS_API_KEY;
  return new Promise((resolve, reject) => {
    https.request(opts, (resp) => {
      const data = [];
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => {
        data.push(chunk);
      }).on('end', () => {
        resolve(data.join(''));
      });
    }).on('error', (e) => {
      reject(e);
      // logger.error(e.message, 'in method: buildRequest', opts);
    }).end();
  });
};


/**
* getNews takes an array of news source ID's and returns a concatenated array of
* news articles. Because this is network level processing we take advantage of
* async.map which allows for anync parallel processing.
* @param {String|Array} src - String or Array of news source ID's
* @return {Object} JSON object of news Articles
*/
const getNews = (src, cb) => {
  const sources = !(src instanceof Array) ? [src] : src;
  const opts = Object.assign({}, _defaults);
  opts.headers['X-Api-Key'] = envVars.NEWS_API_KEY;
  const getArticles = (id, callback) => {
    opts.path = `${articlePath}?source=${id}`;
    // utils.buildMultiRequest(opts, callback);
    https.request(opts, (resp) => {
      const data = [];
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => {
        data.push(chunk);
      }).on('end', () => {
        callback(null, JSON.parse(data.join('')));
      });
    }).on('error', (e) => {
      // logger.error(e.message, 'in method: buildMultiRequest', opts);
      callback(e);
    }).end();
  };
  async.map(sources, getArticles, (e, results) => {
    cb(e, results);
  });
};

module.exports = {
  getNews,
  getSources,
  handleSuccess,
  handleError,
};
