const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/hanuman_traders';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            const users = await mongoose.connection.db.collection('users').countDocuments();
            const roles = await mongoose.connection.db.collection('roles').countDocuments();

            console.log(`Users Count: ${users}`);
            console.log(`Roles Count: ${roles}`);

            if (users > 0) {
                const allUsers = await mongoose.connection.db.collection('users').find({}).toArray();
                console.log('First User:', JSON.stringify(allUsers[0], null, 2));
            }

        } catch (e) {
            console.error(e);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error('MongoDB connection error:', err));
