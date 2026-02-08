const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function searchAllCollections() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const idToSearch = '6982a32c74e0c3332ed8273f';
        const collections = await mongoose.connection.db.listCollections().toArray();

        for (const col of collections) {
            const result = await mongoose.connection.db.collection(col.name).findOne({ _id: new mongoose.Types.ObjectId(idToSearch) });
            if (result) {
                console.log(`Found in collection: ${col.name}`);
                console.log(result);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

searchAllCollections();
