const jwt = require('jsonwebtoken');
const config = require('config');
const debug = require('debug')('app:middleware:auth');

const auth = () => {
  return (req, res, next) => {
    try {
      const authCookie = req.cookies.authToken;
      debug(authCookie);
      if (authCookie) {
        const authPayload = jwt.verify(authCookie, config.get('auth.secret'));
        debug(config.get('auth.secret'));
        req.auth = authPayload;
      }
    } catch (error) {
      debug(error);
    }
    next();
  };
};

module.exports = auth;
