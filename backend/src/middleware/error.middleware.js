const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // Avoid circular references by only sending safe fields
    error: {
      message: err.message,
      status: err.status,
      statusCode: err.statusCode,
    },
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for developers
    logger.error('ERROR 💥', err);

    // Send generic message
    res.status(err.statusCode || 500).json({
      status: 'error',
      message: err.statusCode === 404 ? err.message : 'Something went wrong!'
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // DEBUG: Log all errors to file
  try {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../../middleware_error.log');
    const msg = `[${new Date().toISOString()}] ${err.statusCode} - ${err.message}\nStack: ${err.stack}\nOrigin: ${req.headers.origin}\n\n`;
    fs.appendFileSync(logPath, msg);
  } catch (e) { console.error('Log write failed', e); }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);

    sendErrorProd(error, res);
  }
};

module.exports = {
  AppError,
  errorHandler
}; 