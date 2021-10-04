const debug = require('debug')('app:routes:api:pet');
const debugError = require('debug')('app:error');
const express = require('express');
const { nanoid } = require('nanoid');
const dbModule = require('../../database');
const { newId } = require('../../database');
const Joi = require('joi');
const { valid } = require('joi');

const petsArray = [
  { _id: '1', name: 'Fido', createdDate: new Date() },
  { _id: '2', name: 'Watson', createdDate: new Date() },
  { _id: '3', name: 'Loki', createdDate: new Date() },
];

// create a router
const router = express.Router();

// define routes
router.get('/list', async (req, res, next) => {
  try {
    const pets = await dbModule.findAllPets();
    res.json(pets);
  } catch (err) {
    next(err);
  }
});
router.get('/:petId', async (req, res, next) => {
  try {
    const petId = newId(req.params.petId);
    const pet = await dbModule.findPetById(petId);
    if (!pet) res.status(404).json({ error: `PetId ${petId} not found` });
    else res.status(200).json(pet);
  } catch (err) {
    next(err);
  }

  // array lookup
  // const pet = petsArray[petId];
  // res.json(pet);

  // linear search
  // let pet = null;
  // for (const p of petsArray) {
  //   if (p.name == petId) {
  //     pet = p;
  //     break;
  //   }
  // }
  // res.json(pet);

  // using find
  // const pet = petsArray.find((x) => x._id == petId);
  // if (!pet) {
  //   res.status(404).json({ error: 'Pet not found.' });
  // } else {
  //   res.json(pet);
  // }
});
router.put('/new', async (req, res, next) => {
  try {
    const schema = Joi.object({
      species: Joi.string()
        .trim()
        .min(1)
        .pattern(/^[^0-9]+$/, 'not numbers')
        .required(),
      name: Joi.string().trim().min(1).required(),
      age: Joi.number().integer().min(0).max(1000).required(),
      gender: Joi.string().trim().length(1).required(),
    });

    const validateResult = schema.validate(req.body, { abortEarly: false });
    if (validateResult.error) {
      return res.status(400).json({ error: validateResult.error });
    }
    const pet = validateResult.value;
    pet._id = newId();
    debug('insert pet', pet);

    await dbModule.insertOnePet(pet);
    res.json({ message: 'Pet inserted.' });
  } catch (err) {
    next(err);
  }
});
router.put('/:petId', async (req, res, next) => {
  try {
    const petId = newId(req.params.petId);

    const schema = Joi.object({
      species: Joi.string()
        .trim()
        .min(1)
        .pattern(/^[^0-9]+$/, 'not numbers'),
      name: Joi.string().trim().min(1),
      age: Joi.number().integer().min(0).max(1000),
      gender: Joi.string().trim().length(1),
    });
    const validateResult = schema.validate(req.body, { abortEarly: false });
    if (validateResult.error) {
      res.status(400).json({ error: validateResult.error });
    }

    const update = validateResult.value;
    debug(`update pet ${petId},`, update);

    const pet = await dbModule.findPetById(petId);
    if (!pet) {
      res.status(404).json({ error: `Pet ${petId} not found.` });
    } else {
      await dbModule.updatePetById(petId, update);
      res.json({ message: `Pet ${petId} updated.` });
    }
    pet.lastUpdated = new Date();
  } catch (err) {
    next(err);
  }
});
router.delete('/:petId', async (req, res, next) => {
  try {
    const petId = newId(req.params.petId);
    debug(`delete pet${petId}`);

    const pet = await dbModule.deletePetById(petId);
    if (!pet) {
      res.status(404).json({ error: `Pet ${petId} not found.` });
    } else {
      res.json({ message: `pet ${petId} deleted` });
    }
  } catch (err) {
    next(err);
  }
});

// export router
module.exports = router;
