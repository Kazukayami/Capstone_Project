class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFoundHandler(_req, _res, next) {
  next(new AppError("Route not found", 404));
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: error.message || "Internal server error",
      statusCode
    }
  });
}

module.exports = { AppError, errorHandler, notFoundHandler };

