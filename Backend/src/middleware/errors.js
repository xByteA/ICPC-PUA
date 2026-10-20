export function notFound(req, res) {
  res.status(404).json({ error: { message: 'Endpoint not found.' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.code === 11000) {
    return res.status(409).json({ error: { message: 'A record with those details already exists.' } });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ error: { message: 'The submitted data is invalid.' } });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: { message: status >= 500 ? 'An unexpected server error occurred.' : error.message },
  });
}
