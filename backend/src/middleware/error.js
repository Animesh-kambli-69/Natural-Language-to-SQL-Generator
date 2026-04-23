export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;
  const message = isServerError ? 'Internal server error' : err.message || 'Request failed';

  return res.status(statusCode).json({
    error: message
  });
}
