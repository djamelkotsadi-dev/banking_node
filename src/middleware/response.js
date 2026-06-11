export const ok = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

export const created = (res, message, data) =>
  ok(res, message, data, 201);

export const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });
