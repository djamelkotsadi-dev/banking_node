import jwt from "jsonwebtoken";
import { fail } from "./response.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, "Token manquant ou invalide.", 403);
  }
  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return fail(res, "Token expiré ou invalide.", 403);
  }
}
