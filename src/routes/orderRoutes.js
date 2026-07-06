const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getPendingOrders,
  updateOrderStatus,
  deleteOrder,
  getAllAdminOrders,
} = require("../controllers/orderController");
const { protect, admin } = require("../middlewares/authMiddleware");

// cutomer order post api
router.post("/checkout", placeOrder);

// admin pending orders get api
router.get("/admin/pending", protect, admin, getPendingOrders);
// admin get all confirmed orders
router.get("/admin/all", protect, admin, getAllAdminOrders);

router.put("/admin/:id/status", protect, admin, updateOrderStatus);
router.delete("/admin/:id", protect, admin, deleteOrder);

module.exports = router;
