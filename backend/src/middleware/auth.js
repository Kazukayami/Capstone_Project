const prisma = require("../db");
const { AppError } = require("../utils/errors");

async function requireApiClient(req, _res, next) {
  try {
    const apiKey = req.header("x-api-key");
    const apiSecret = req.header("x-api-secret");

    if (!apiKey || !apiSecret) {
      throw new AppError("Missing x-api-key or x-api-secret header", 401);
    }

    const client = await prisma.apiClient.findUnique({ where: { apiKey } });
    if (!client || client.apiSecret !== apiSecret || !client.active) {
      throw new AppError("Invalid or inactive API credentials", 401);
    }

    req.apiClient = client;
    req.startedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
}

async function logApiUsage(req, res, next) {
  res.on("finish", async () => {
    if (!req.apiClient) return;
    try {
      await prisma.apiRequestLog.create({
        data: {
          apiClientId: req.apiClient.id,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          responseTime: Date.now() - (req.startedAt || Date.now()),
          ipAddress: req.ip
        }
      });
    } catch (error) {
      console.error("Failed to log API usage", error);
    }
  });
  next();
}

module.exports = { requireApiClient, logApiUsage };

