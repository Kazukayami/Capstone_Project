const express = require("express");
const { z } = require("zod");
const prisma = require("../db");
const { requireApiClient, logApiUsage } = require("../middleware/auth");

const router = express.Router();

router.use(requireApiClient, logApiUsage);

router.get("/states", async (_req, res, next) => {
  try {
    const states = await prisma.state.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { districts: true } } }
    });
    res.json({ data: states });
  } catch (error) {
    next(error);
  }
});

router.get("/districts", async (req, res, next) => {
  try {
    const stateId = z.coerce.number().int().positive().optional().parse(req.query.stateId);
    const districts = await prisma.district.findMany({
      where: stateId ? { stateId } : undefined,
      orderBy: { name: "asc" },
      include: { state: true, _count: { select: { subDistricts: true } } }
    });
    res.json({ data: districts });
  } catch (error) {
    next(error);
  }
});

router.get("/sub-districts", async (req, res, next) => {
  try {
    const districtId = z.coerce.number().int().positive().optional().parse(req.query.districtId);
    const subDistricts = await prisma.subDistrict.findMany({
      where: districtId ? { districtId } : undefined,
      orderBy: { name: "asc" },
      include: { district: { include: { state: true } }, _count: { select: { villages: true } } }
    });
    res.json({ data: subDistricts });
  } catch (error) {
    next(error);
  }
});

router.get("/villages", async (req, res, next) => {
  try {
    const query = z
      .object({
        search: z.string().trim().optional(),
        stateId: z.coerce.number().int().positive().optional(),
        districtId: z.coerce.number().int().positive().optional(),
        subDistrictId: z.coerce.number().int().positive().optional(),
        pincode: z.string().trim().optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20)
      })
      .parse(req.query);

    const where = {
      ...(query.search && { name: { contains: query.search, mode: "insensitive" } }),
      ...(query.pincode && { pincode: query.pincode }),
      ...(query.subDistrictId && { subDistrictId: query.subDistrictId }),
      ...(query.districtId && { subDistrict: { districtId: query.districtId } }),
      ...(query.stateId && { subDistrict: { district: { stateId: query.stateId } } })
    };

    const skip = (query.page - 1) * query.limit;
    const [total, villages] = await Promise.all([
      prisma.village.count({ where }),
      prisma.village.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { name: "asc" },
        include: {
          subDistrict: {
            include: {
              district: {
                include: { state: true }
              }
            }
          }
        }
      })
    ]);

    res.json({
      data: villages,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

