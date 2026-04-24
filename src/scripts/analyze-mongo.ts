import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('D:\\CVS\\9X\\mongo-postgres-etl-pipeline\\.env') });

const analyze = async () => {
  try {
    console.log('Connecting to DocumentDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    const db = mongoose.connection.db!;
    
    console.log('\n--- 1. COLLECTION COUNTS ---');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      if (count > 0) {
        console.log(`- ${col.name}: ${count}`);
      }
    }

    console.log('\n--- 2. VENUE CHECK ---');
    const venuesCount = await db.collection('venues').countDocuments();
    console.log(`Total Venues in Mongo: ${venuesCount}`);
    
    const eventsWithVenues = await db.collection('events').countDocuments({ venueId: { $ne: null } });
    console.log(`Total Events referencing a Venue: ${eventsWithVenues}`);

    console.log('\n--- 3. ORPHANED DATA CHECK ---');
    
    // Check Events -> Sports
    const distinctEventSportIds = await db.collection('events').distinct('sportId');
    const validSports = await db.collection('sports').find({ _id: { $in: distinctEventSportIds.map(id => {
      try { return new mongoose.Types.ObjectId(id); } catch(e) { return id; }
    })}}).toArray();
    const validSportIds = validSports.map(s => s._id.toString());
    const orphanedEventsBySport = distinctEventSportIds.filter(id => id && !validSportIds.includes(id.toString()));
    console.log(`Number of distinct Sport IDs in Events that DO NOT exist in Sports collection: ${orphanedEventsBySport.length}`);

    // Check Leagues -> Sports
    const distinctLeagueSportIds = await db.collection('leagues').distinct('sportId');
    const orphanedLeaguesBySport = distinctLeagueSportIds.filter(id => id && !validSportIds.includes(id.toString()));
    console.log(`Number of distinct Sport IDs in Leagues that DO NOT exist in Sports collection: ${orphanedLeaguesBySport.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
};

analyze();
