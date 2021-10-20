const debug = require('debug')('app:database');
const { MongoClient, ObjectId } = require('mongodb');
const config = require('config');

const newId = (str) => ObjectId(str);

let _db = null;

/** Miscellaneous functions */
/**
 * Connect to the database
 * @returns {Promise<db>}
 */
async function connect() {
  if (!_db) {
    const dbUrl = config.get('db.url');
    const dbName = config.get('db.name');
    const client = await MongoClient.connect(dbUrl);
    _db = client.db(dbName);
    debug('Connected.');
  }
  return _db;
}
async function ping() {
  const db = await connect();
  await db.command({ ping: 1 });
  debug('Ping.');
}

/** Pet functions */
async function findAllPets() {
  const db = await connect();
  const pets = await db.collection('pets').find({}).toArray();
  return pets;
}
async function findPetById(petId) {
  const db = await connect();
  const pet = await db.collection('pets').findOne({ _id: { $eq: /* new ObjectId */ petId } });
  return pet;
}
async function insertOnePet(pet, currentDate) {
  const db = await connect();
  return await db.collection('pets').insertOne({ ...pet, createdDate: currentDate });
}
async function updatePetById(petId, update) {
  const db = await connect();
  db.collection('pets').updateOne(
    { _id: { $eq: petId } },
    {
      $set: {
        ...update,
        /* lastUpdated: new Date(), */
      },
    }
  );
}
async function deletePetById(petId) {
  const db = await connect();
  await db.collection('pets').deleteOne({ _id: { $eq: petId } });
}

/** User functions */
async function findAllUsers() {
  const db = await connect();
  return await db.collection('users').find({}).toArray();
}
async function insertOneUser(user) {
  const db = await connect();
  return await db.collection('users').insertOne(user);
}
async function updateOneUser(userId, fields) {
  const db = await connect();
  return await db.collection('users').updateOne({ _id: { $eq: userId } }, { $set: { ...fields } });
}
async function findUserById(userId) {
  const db = await connect();
  return await db.collection('users').findOne({ _id: { $eq: userId } });
}
async function findUserByEmail(email) {
  const db = await connect();
  return await db.collection('users').findOne({ email: { $eq: email } });
}

/** Edit functions */
async function saveEdit(edit) {
  const db = await connect();
  return await db.collection('edits').insertOne(edit);
}

ping();

module.exports = {
  /** Miscellaneous functions */
  connect,
  ping,
  newId,

  /** Pet functions */
  findAllPets,
  findPetById,
  insertOnePet,
  updatePetById,
  deletePetById,

  /** User functions */
  findAllUsers,
  insertOneUser,
  updateOneUser,
  findUserById,
  findUserByEmail,

  /** Edit functions */
  saveEdit,
};
