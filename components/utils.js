const throwError = (err) => {
  if (err.message === "Cannot read property 'name' of undefined") {
    throw new Error('Invalid keyword');
  } else {
    throw new Error(err.message);
  }
};

module.exports = {
  throwError,
};
