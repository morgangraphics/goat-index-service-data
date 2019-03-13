const axios = require('axios');
const crypto = require('crypto');
const joi = require('joi');
const Snoowrap = require('snoowrap');
const utils = require('./utils');

/**
* Schema Validation to make sure NEWS_API_KEY is in the environment before doing anything
*/
const envVarsSchema = joi.object({
  REDDIT_USER_AGENT: joi.string().required(),
  REDDIT_CLIENT_ID: joi.string().required(),
  REDDIT_CLIENT_SECRET: joi.string().required(),
  REDDIT_USERNAME: joi.string().required(),
  REDDIT_PASSWORD: joi.string().required(),
}).unknown()
  .required();

const { error, value: envVars } = joi.validate(process.env, envVarsSchema);
if (error) {
  throw new Error(`Config validation error: ${err.message}`);
}

/**

* Format needed to grab news API data via AJAX
*/
// <platform>:<app ID>:<version string> (by /u/<reddit username>)
const r = new Snoowrap({
  userAgent: envVars.REDDIT_USER_AGENT,
  clientId: envVars.REDDIT_CLIENT_ID,
  clientSecret: envVars.REDDIT_CLIENT_SECRET,
  username: envVars.REDDIT_USERNAME,
  password: envVars.REDDIT_PASSWORD,
});

const defaults = {
  author: '',
  title: '',
  description: '',
  url: '',
  urlToImage: '',
  publishedAt: '',
};

/**
 * TODO: This needs some work. Currently, I am normalizing the title to determine if
 * there is a repost with the exact same title but submitted by someone else.
 * I do this because I am checking the same subreddit with different options to help with
 * scoring popularity. This is a quick spot check but doesn't address someone posting
 * a different title but the exact same content. Secondly this only checks for
 * dupes on every iteration but not globally e.g. there is no memory of previous
 * checks. The duped hashes need to be stored in memory/database and persisted
 * throughout the life of the service.
 }
 * @param  {Array} data Dataset Array coming back from subreddit
 * @return {Array}      Array of unique reddit posts
 */
const dedupe = (data) => {
  const dedup = {};
  const deduped = [];
  data.forEach((item) => {
    const title = `${item.title}-${item.author.name}`.replace(/\s/g, '_').toLowerCase();
    // console.log('title = ', title);
    const titleH = crypto.createHash('sha256').update(title, 'binary').digest('base64');
    const descH = crypto.createHash('sha256').update(item.selftext_html || title, 'binary').digest('base64');
    if (!dedup[titleH]) {
      dedup[titleH] = item.title;
      // console.log('dedupe = ', item.title);
      deduped.push(item);
    } else {
      // Count how many deduped
    }
  });
  return deduped;
};

const escapeSpecialChars = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Ensure we are actually grabbing stuff
 * @param  {[type]} data    [description]
 * @param  {[type]} keyword [description]
 * @return {[type]}         [description]
 */
const textFilter = (data, keyword) => {
  const keywordOnly = [];
  data.forEach((subreddit) => {
    subreddit.forEach((item) => {
      const desc = hasDesc(item);
      const search = new RegExp(escapeSpecialChars(keyword), 'mgi');
      console.log('title = ', item.title, 'title match =', item.title.match(search), 'desc match = ', (desc && desc.match(search)), 'item = ', item);
      if (item.title.match(search) || (desc && desc.match(search))) {
        keywordOnly.push(item);
      }
    });
  });
  console.log('KO = ', keywordOnly.map(item => item.title));
  return keywordOnly;
};

const hasDesc = (item) => {
  let desc = false;
  if (item.selftext) { desc = item.selftext; }
  if (item.selftext_html) { desc = item.selftext_html; }
  if (item.description) { desc = item.description; }
  return desc;
};

const normalize = (data) => {
  const newData = [];
  data.forEach((item) => {
    const opts = Object.assign({}, defaults);
    opts.author = item.author.name;
    opts.title = item.title;
    opts.description = item.selftext_html || item.title;
    opts.url = !utils.imageTest(item.url) ? item.url : '';
    opts.urlToImage = utils.imageTest(item.url) ? item.url : '';
    opts.publishedAt = new Date(item.created_utc * 1000).toISOString();
    newData.push(opts);
  });
  return newData;
};


const getSearchResults = (keyword) => {
  if (!keyword) {
    throw new Error('Missing keyword');
  } else {
    const response = r.search({
      query: keyword,
    }).then(resp => resp)
      .catch(err => utils.throwError(err));
    return response;
  }
};

const getNewSubReddit = (keyword) => {
  if (!keyword) {
    throw new Error('Missing keyword');
  } else {
    const response = r.getSubreddit(keyword)
      .getNew()
      .then(resp => resp)
      .catch(err => utils.throwError(err));
    return response;
  }
};
const getHotSubReddit = (keyword) => {
  if (!keyword) {
    throw new Error('Missing keyword');
  } else {
    const response = r.getSubreddit(keyword)
      .getHot()
      .then(resp => resp)
      .catch(err => utils.throwError(err));
    return response;
  }
};

const getTopSubReddit = (keyword) => {
  if (!keyword) {
    throw new Error('Missing keyword');
  } else {
    const response = r.getSubreddit(keyword)
      .getTop()
      .then(resp => resp)
      .catch(err => utils.throwError(err));
    return response;
  }
};

const getReddits = (keywords) => {
  const response = axios.all([
    // These hit up a specific subreddit looking for New, Top and Hot posts
    getNewSubReddit(keyword),
    getHotSubReddit(keyword),
    getTopSubReddit(keyword),
    // Does a search arcoss Reddit for the keyword.
    getSearchResults(keyword),
  ])
    .then((data) => { console.log(data); return textFilter(data, keyword); })
    .then(dedupe)
    .then((deduped) => { console.log('deduped = ', deduped); return normalize(deduped); })
    .then((normalized) => { console.log('normalized = ', normalized); })
    .catch(err => utils.throwError(err));
  return response;
};


module.exports = {
  getReddits,
  normalize,
};
