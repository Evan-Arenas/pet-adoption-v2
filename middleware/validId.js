// const validId = (req, res, next) => {
//   try {
//     req.petId = newId(req.params.petId);
//     next();
//   } catch (error) {
//     return res.status(404).json({ error: 'PetId was not a valid objectId.' });
//   }
// };

const { ObjectId } = require('mongodb');

const validId = (paramName) => {
  return (req, res, next) => {
    try {
      req[paramName] = newId(req.params[paramName]);
      next();
    } catch (error) {
      return res.status(404).json({ error: `${paramName} was not a valid objectId.` });
    }
  };
};

module.exports = validId;
