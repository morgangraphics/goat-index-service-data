const axios = require('axios');
const joi = require('joi');
const utils = require('./utils');

const getStemmer = (keyword) => {
  if (!keyword) {
    throw new Error('Missing keyword');
  } else {
    const response = axios({
      method: 'GET',
      url: `${process.env.NLTK_DATA_URL}/stemmer/${keyword}`,
    })
      .then(resp => resp.data.words)
      .catch(err => utils.throwError(err));
    return response;
  }
};


const getNLTK = (keyword) => {
  const response = axios.all([
    // These hit up a specific subreddit looking for New, Top and Hot posts
    getStemmer(keyword),
  ])
    .then(stems => stems.concat([keyword]))
    .catch(err => utils.throwError(err));
  return response;
};


module.exports = {
  getNLTK,
};
