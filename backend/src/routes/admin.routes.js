const express = require("express");
const prisma = require("../db");

const router = express.Router();

router.get("/overview", async (_req, res, next) => {
  try {
    const [states, districts, subDistricts, villages, clients, requests] = await Promise.all([
      prisma.state.count(),
      prisma.district.count(),
      prisma.subDistrict.count(),
      prisma.village.count(),
      prisma.apiClient.count(),
      prisma.apiRequestLog.count()
    ]);

    const topEndpoints = await prisma.apiRequestLog.groupBy({
      by: ["path"],
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 5
    });

    const recentRequests = await prisma.apiRequestLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { apiClient: { select: { name: true, plan: true } } }
    });

    res.json({
      data: {
        totals: { states, districts, subDistricts, villages, clients, requests },
        topEndpoints,
        recentRequests
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/clients", async (_req, res, next) => {
  try {
    const clients = await prisma.apiClient.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { requests: true } } }
    });
    res.json({ data: clients });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

