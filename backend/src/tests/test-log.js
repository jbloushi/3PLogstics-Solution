const mongoose = require('mongoose');
const CarrierLog = require('../models/CarrierLog');
require('../config/config'); // Load env? simpler to just mock connection if possible or use existing

// We need a DB connection. Since we can't easily spin one up in 10s without credentials, 
// we'll rely on the existing connection if we run this via a script that connects.
// Actually, let's just inspect the schema syntax via code inspection or minimal parse.
// The best test is to dry-run the ensuring fields match.

try {
    const log = new CarrierLog({
        user: new mongoose.Types.ObjectId(),
        shipment: new mongoose.Types.ObjectId(),
        carrier: 'DHL',
        endpoint: 'test',
        requestPayload: { foo: 'bar' },
        success: true
    });
    console.log('✅ CarrierLog model instantiated successfully.');

    // Validate
    const err = log.validateSync();
    if (err) {
        console.error('❌ Validation Error:', err);
        process.exit(1);
    } else {
        console.log('✅ CarrierLog validation passed.');
        process.exit(0);
    }

} catch (e) {
    console.error('❌ unexpected error:', e);
    process.exit(1);
}
