const Axios = require('axios');
const Boom = require('boom');
const Joi = require('joi');
const nltk = require('../components/nltk');
const red = require('../components/reddit');
const utils = require('../components/utils');

const healthcheck = {
  method: 'GET',
  path: '/healthcheck',
  handler: () => ({ status: 'Hello' }),
};

const news = {
  method: 'GET',
  path: '/news/{keyword}',
  options: {
    handler: (req, h) => {
      // TODO: Need to handle different combinations and multiples of search
      const { keyword } = req.params;
      const { prettyPrint } = req.query;
      // const promises = [];
      try {
        return nltk.getNLTK(keyword)
          .then((keywords) => { console.log(keywords); return red.getReddits(keywords); })
          .then((data) => {
            // data.forEach((item, i) => {
            // // if (utils.imageTest(item.urlToImage)) {
            // //   const opts = Object.assign({}, _defaults);
            // //   opts.data.request.url = item.urlToImage;
            // //   // opts.data.request.meta.image_name = `${Date.now()}-${i}`;
            // //   promises.push(JSON.parse(JSON.stringify(opts)));
            // // }
            // });
            //
            // utils.post(promises, (response) => {
            //   console.log('+======================================+', response);
            // });
            console.log('foo');
            return data;
          })
          .then((data) => {
            const d = prettyPrint ? JSON.stringify(data, null, 4) : data;
            return h.response(d).header('Content-Type', 'application/json');
          })
          .catch((err) => {
            console.log('ERROR = ', err);
            return Boom.badRequest(err.message);
          })
          .finally(() => {
            console.log('finally');
          });
      } catch (err) {
        return Boom.badRequest(err.message);
      }
    },

    description: 'Search for Keyword',
    notes: [
      'Retruns a JSON object of news conaining the keyword',
      'OR',
      'Returns a JSON object of news containing word combinations',
      '`{keyword1},{keyword2}` e.g. `goat,farm` will search for each word individually',
      '`{keyword1}+{keyword2}` e.g. `goat+farm` will search for a post containing both goat AND farm',
      '`{keyword1}-{keyword2}` e.g. `goat-farm` will search for a post containing goat BUT NOT farm',
    ],
    tags: ['api'], // ADD THIS TAG
    validate: {
      params: {
        keyword: Joi.string()
          .required()
          .description('the keyword(s) to search for'),
      },
      query: Joi.object({
        prettyPrint: Joi.bool(),
      })
        .optional()
        .description('Pretty Print the JSON response'),
    },
  },
};

const routes = [
  healthcheck,
  news,
];

module.exports = routes;
