import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
dotenv.config();

// Generates valid 24-character hex strings for raw Mongo ObjectIds
const createObjectId = () => new mongoose.Types.ObjectId();

const runSeed = async () => {
  if (!process.env.MONGO_URI || !process.env.MONGO_URI.includes('localhost')) {
    logger.error('CRITICAL SAFETY STOP: Your MONGO_URI is not pointing to localhost! Stopping Seed to prevent wiping production data.');
    process.exit(1);
  }

  logger.info('🚀 Connecting to Local Mongoose...');
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db!;

  logger.warn('⚠️ WIPING LOCAL MONGODB DATABASE...');
  await db.dropDatabase();

  logger.info('✅ Database wiped. Commencing Seeding...');

  // 1. Seed Currencies
  const currenciesCount = 3;
  const currencies = Array.from({ length: currenciesCount }).map(() => ({
    _id: createObjectId(),
    name: faker.finance.currencyName(),
    code: faker.finance.currencyCode(),
    value: faker.finance.amount().toString(),
    betFair: faker.datatype.boolean()
  }));
  await db.collection('currencies').insertMany(currencies);
  logger.info(`✅ Seeded ${currenciesCount} Currencies`);

  // 2. Seed Users (Including nested Array Hierarchies)
  const masterAgentId = createObjectId();
  const subAgentId = createObjectId();

  const usersCount = 2500;
  const users = Array.from({ length: usersCount }).map((_, i) => {
    const isPlayer = i > 1; // First two are agents
    const userId = i === 0 ? masterAgentId : i === 1 ? subAgentId : createObjectId();
    
    // Simulate complex parent array data
    const parents = isPlayer ? [
      { parent_id: masterAgentId, role: 1 },
      { parent_id: subAgentId, role: 2 }
    ] : [];

    return {
      _id: userId,
      name: faker.person.fullName(),
      // Append index to guarantee uniqueness — prevents FK cascade failures downstream
      username: `${faker.internet.userName()}_${i}`,
      email: `user_${i}_${faker.internet.email()}`,
      password: faker.internet.password(),
      mobileNo: faker.string.numeric(10),
      role: isPlayer ? 3 : (i === 0 ? 1 : 2),
      balance: faker.number.float({ min: 0, max: 10000 }),
      parents: parents, // This is exactly what we mapped in `tier3-users.ts`
      currencyId: currencies[0]._id, // Attach to fake currency
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });
  await db.collection('users').insertMany(users);
  logger.info(`✅ Seeded ${usersCount} Users with complex Parent Hierarchies`);

  // 3. Seed Hierarchy (Sports -> Leagues -> Events)
  const sportId = createObjectId();
  await db.collection('sports').insertOne({
    _id: sportId,
    name: 'Soccer',
    eventsCount: 10,
    status: '1'
  });

  const leagueId = createObjectId();
  await db.collection('leagues').insertOne({
    _id: leagueId,
    sportId: sportId,
    name: 'Premier League',
    status: '1'
  });

  const eventIds = Array.from({ length: 5 }).map(() => createObjectId());
  const events = eventIds.map(eId => ({
    _id: eId,
    sportId: sportId,
    leagueId: leagueId,
    name: `${faker.location.city()} vs ${faker.location.city()}`,
    status: '1',
    date: faker.date.future().toISOString()
  }));
  await db.collection('events').insertMany(events);
  logger.info('✅ Seeded Sports, Leagues, and Events');

  // 4. Seed Heavy Transactional Bets
  const betsCount = 5000;
  const bets = Array.from({ length: betsCount }).map(() => {
    // Pick a random player from users array (ignoring first two active agents)
    const randomUser = users[faker.number.int({ min: 2, max: users.length - 1 })];
    const randomEventId = eventIds[faker.number.int({ min: 0, max: eventIds.length - 1 })];

    return {
      _id: createObjectId(),
      userId: randomUser._id,
      sportId: sportId,
      leagueId: leagueId,
      eventId: randomEventId,
      marketId: createObjectId(),
      marketType: 'Match Odds',
      stake: faker.number.float({ min: 10, max: 500 }),
      odds: faker.number.float({ min: 1.1, max: 5.0 }),
      status: '1',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });
  await db.collection('sportbets').insertMany(bets);
  logger.info(`✅ Seeded ${betsCount} heavy SportBets mapped to Users and Events!`);

  console.log('\n🎉 ALL DONE! Your MongoDB localhost is now seeded with highly relational mock legacy data. You may now run `npm start` to execute the Postgres ETL Pipeline!');
  process.exit(0);
};

runSeed();
