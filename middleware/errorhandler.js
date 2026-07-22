// Wrap async route handlers so thrown errors go to next() instead of crashing the process
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Must be registered LAST, after all routes
export function errorHandler(err, req, res, _next) {
  console.error(`[error] ${req.method} ${req.path}:`, err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err.message;

  res.status(status).json({ message });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
}