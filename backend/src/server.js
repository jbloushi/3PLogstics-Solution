const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { port, mongoUri, corsOrigin } = require('./config/config');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/error.middleware');
const { checkDbAuth } = require('./middleware/auth.middleware');
const shipmentRoutes = require('./routes/shipment.routes');
const authRoutes = require('./routes/auth.routes');
const authController = require('./controllers/auth.controller');
const userRoutes = require('./routes/user.routes');
const seedDemoData = require('./services/seedDemoData');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration with origin whitelisting
const corsOptions = {
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map(origin => origin.trim()),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use('/uploads', express.static('uploads'));

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Database connection check middleware
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('MongoDB not connected, attempting to reconnect...');
    connectDB()
      .then(() => {
        logger.info('MongoDB reconnected successfully');
        next();
      })
      .catch(err => {
        logger.error('Failed to reconnect to MongoDB:', err);
        res.status(500).json({
          success: false,
          error: 'Database connection error. Please try again later.'
        });
      });
  } else {
    next();
  }
});

// Routes
const geocodeRoutes = require('./routes/geocode.routes');
const receiverRoutes = require('./routes/receiver.routes');
const pickupRoutes = require('./routes/pickup.routes');
const externalRoutes = require('./routes/external.routes');

const apiRoutes = require('./routes/api.routes');
const financeRoutes = require('./routes/finance.routes');
const organizationRoutes = require('./routes/organization.routes');

// Mount routes with /api prefix (for direct access or non-stripping proxies)
app.use('/api/auth', authRoutes);
app.use('/api/finance', checkDbAuth, financeRoutes);
app.use('/api/users', checkDbAuth, userRoutes);
app.use('/api/organizations', checkDbAuth, organizationRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/client', externalRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/receivers', receiverRoutes);
app.use('/api/shipments', checkDbAuth, shipmentRoutes);

// Mount routes WITHOUT /api prefix (for proxies that strip /api)
app.use('/auth', authRoutes);
app.use('/finance', checkDbAuth, financeRoutes);
app.use('/users', checkDbAuth, userRoutes);
app.use('/organizations', checkDbAuth, organizationRoutes);
app.use('/pickups', pickupRoutes);
app.use('/client', externalRoutes);
app.use('/v1', apiRoutes);
app.use('/geocode', geocodeRoutes);
app.use('/receivers', receiverRoutes);
app.use('/shipments', checkDbAuth, shipmentRoutes);

// Add redirect for /shipments to /api/shipments
app.use('/shipments', (req, res) => {
  // Redirect to the same path but with /api prefix
  const redirectUrl = `/api${req.url}`;
  res.redirect(307, redirectUrl);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    database: dbStatus
  });
});


// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Shipment Tracker API is running',
    endpoints: {
      health: '/health',
      api: '/api/shipments'
    }
  });
});

const { AppError } = require('./middleware/error.middleware');

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(errorHandler);

const seedUsers = require('./utils/seeder');

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Run seed in development to populate In-Memory DB
    console.log('DEBUG: NODE_ENV is', process.env.NODE_ENV);
    if (process.env.NODE_ENV === 'development') {
      logger.info('Running startup dataseeding...');
      await seedDemoData();
    }

    // Start Express server
    server = app.listen(port, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
    });
    console.log('Called app.listen');

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Please stop other processes.`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
      }
    });

    // Handle server shutdown
    const gracefulShutdown = async () => {
      logger.info('Shutting down server...');
      server.close(async () => {
        logger.info('Express server closed');
        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');
          process.exit(0);
        } catch (err) {
          logger.error('Error closing MongoDB connection:', err);
          process.exit(1);
        }
      });
    };

    // Handle process termination
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if run directly
if (require.main === module) {
  startServer();
}

module.exports = app; // For testing
