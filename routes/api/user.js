const debug = require('debug')('app:routes:api:user');
const debugError = require('debug')('app:error');
const config = require('config');
const express = require('express');
const dbModule = require('../../database.js');
const { newId, connect } = require('../../database.js');
const validId = require('../../middleware/validId');
const validBody = require('../../middleware/validBody');
const Joi = require('joi');
const { valid, object } = require('joi');
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
router.get('/list', async (req, res, next) => {
  const users = await dbModule.findAllUsers();
  if (users) {
    debug(users);
    res.status(200).json(users);
  } else {
    res.status(404).json({ error: `No users found in database!` });
  }
});
router.post('/register', validBody(newUserSchema), async (req, res, next) => {
  try {
    const currentDate = new Date();
    const userId = newId();
    const user = { ...req.body, _id: userId, createdDate: currentDate, role: 'customer' };

    // hash the password, if updated
    user.password = await bcrypt.hash(user.password, parseInt(config.get('auth.saltRounds')));

    if (await dbModule.findUserByEmail(user.email)) {
      res.status(400).json({ error: `Email "${user.email}" already in use!` });
    } else {
      const edit = {
        timestamp: currentDate,
        operation: 'insert',
        collection: 'users',
        target: { userId },
        change: user,
      };
      await dbModule.saveEdit(edit);

      const result = await dbModule.insertOneUser(user);
      debug(result);

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

      res.json({ message: 'New user registered!', userId, token: authToken });
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

      res.status(200).json({ message: `Welcome back!`, userId: user._id, token: authToken });
    } else {
      res.status(404).json({ message: `Invalid credentials!` });
    }
  } catch (error) {
    next(error);
  }
});
router.put('/me', validBody(updateUserSchema), async (req, res, next) => {
  // SELF-SERVICE USER UPDATE
  try {
    if (!req.auth) {
      res.status(401).json({ error: 'Invalid token/You must be logged in' });
    } else {
      const userId = newId(req.auth._id);
      const fields = req.body;

      if (fields.password) {
        fields.password = await bcrypt.hash(fields.password, parseInt(config.get('auth.saltRounds')));
      }

      if (Object.keys(fields).length > 0) {
        fields.lastUpdatedOn = new Date();
        fields.lastUpdatedBy = {
          _id: req.auth._id,
          email: req.auth.email,
          fullName: req.auth.fullName,
          role: req.auth.role,
        };
      }

      const result = await dbModule.updateOneUser(userId, fields);
      // debug(result);

      const edit = {
        timestamp: new Date(),
        operation: 'update',
        collection: 'users',
        target: { userId },
        change: fields,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
      // debug(edit);

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
    if (!req.auth) {
      res.status(401).json({ error: 'Invalid token/You must be logged in' });
    } else {
      const userId = req.userId;
      const fields = req.body;

      if (fields.password) {
        fields.password = await bcrypt.hash(fields.password, parseInt(config.get('auth.saltRounds')));
      }

      if (Object.keys(fields).length > 0) {
        fields.lastUpdatedOn = new Date();
        fields.lastUpdatedBy = {
          _id: req.auth._id,
          email: req.auth.email,
          fullName: req.auth.fullName,
          role: req.auth.role,
        };
      }

      const result = await dbModule.updateOneUser(userId, fields);
      debug(result);

      const edit = {
        timestamp: new Date(),
        operation: 'update',
        collection: 'users',
        target: { userId },
        change: fields,
        auth: req.auth,
      };

      await dbModule.saveEdit(edit);
      // debug(edit);

      if (result && result.matchedCount > 0) {
        res.status(200).json({ message: `User updated!`, userId });
      } else {
        res.status(404).json({ message: `User not found!` });
      }
    }
  } catch (error) {
    next(error);
  }
});

// export router
module.exports = router;
