const debug = require('debug')('app:routes:api:user');
const debugError = require('debug')('app:error');
const config = require('config');
const express = require('express');
const dbModule = require('../../database.js');
const { newId, connect } = require('../../database.js');
const validId = require('../../middleware/validId');
const validBody = require('../../middleware/validBody');
const Joi = require('joi');
const { valid } = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Global Variables
const newUserSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().trim().min(8).required(),
  fullName: Joi.string().trim().min(1).required(),
}).required();
const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().trim().min(8).required(),
});
const updateUserSchema = Joi.object({
  email: Joi.string().trim().lowercase().email(),
  password: Joi.string().trim().min(8),
  fullName: Joi.string().trim().min(1),
}).required();

// create a router
const router = express.Router();

// define routes
router.post('/register', validBody(newUserSchema), async (req, res, next) => {
  try {
    const user = { ...req.body, _id: newId(), createdDate: new Date(), role: 'customer' };

    // hash the password
    user.password = await bcrypt.hash(user.password, parseInt(config.get('auth.saltRounds')));

    if (await dbModule.findUserByEmail(user.email)) {
      res.status(400).json({ error: `Email "${user.email}" already in use!` });
    } else {
      const result = await dbModule.insertOneUser(user);
      debug('register result:', result);

      // issue the token
      const authPayload = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };

      const authSecret = config.get('auth.secret');
      const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      // create a cookie
      const cookieOptions = { httpOnly: true, maxAge: parseInt(config.get('auth.cookieMaxAge')) };
      res.cookie('authToken', authToken, cookieOptions);

      res.json({ message: 'New user registered!', userId: user._id, token: authToken });
    }
  } catch (error) {
    next(error);
  }
});
router.post('/login', validBody(loginSchema), async (req, res, next) => {
  try {
    const login = req.body;
    const user = await dbModule.findUserByEmail(login.email);
    if (user && (await bcrypt.compare(login.password, user.password))) {
      // issue the token
      const authPayload = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      const authSecret = config.get('auth.secret');
      const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      // create a cookie
      const cookieOptions = { httpOnly: true, maxAge: parseInt(config.get('auth.cookieMaxAge')) };
      res.cookie('authToken', authToken, cookieOptions);

      res.status(200).json({ message: `Welcome back, bish!`, userId: user._id, token: authToken });
    } else {
      res.status(404).json({ message: `Invalid credentials!` });
    }
  } catch (error) {
    next(error);
  }
});
router.put('/me', validBody(updateUserSchema), async (req, res, next) => {
  // SELF-SERVICE USER UPDATE
  debug(req.auth);
  res.json(req.auth);
  try {
    if (!req.auth) {
      res.status(400).json({ error: `Invalid token/You must be logged in` });
    } else {
      const userId = newId(req.auth._id);
      const fields = req.body;

      if (fields.password) {
        fields.password = await bcrypt.hash(fields.password, parseInt(config.get('auth.saltRounds')));
      }

      const result = await dbModule.updateOneUser(userId, fields);
      debug(result);

      if (result && result.modifiedCount > 0) {
        res.status(200).json({ message: `User updated!` });
      }
    }
  } catch (error) {
    next(error);
  }
});
router.put('/:userId', validId('userId'), validBody(updateUserSchema), async (req, res, next) => {
  // ADMIN USER UPDATE
  try {
    const userId = req.userId;
    const fields = req.body;

    if (fields.password) {
      fields.password = await bcrypt.hash(fields.password, parseInt(config.get('auth.saltRounds')));
    }

    const result = await dbModule.updateOneUser(userId, fields);
    debug(result);

    if (result && result.matchedCount > 0) {
      res.json({ message: `User updated!`, userId });
    } else {
      res.status(404).json({ message: `User not found!` });
    }
  } catch (error) {
    next(error);
  }
});

// export router
module.exports = router;
