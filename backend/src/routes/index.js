const express = require("express");
const adminRoutes = require("./admin.routes");
const locationRoutes = require("./location.routes");

const router = express.Router();

router.use("/locations", locationRoutes);
router.use("/admin", adminRoutes);

module.exports = router;

