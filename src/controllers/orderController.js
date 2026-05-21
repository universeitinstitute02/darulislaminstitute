const Order = require("../models/Order");
const Product = require("../models/Product");

// 1. Post New Order (Public / User Checkout Endpoint)
const placeOrder = async (req, res) => {
  try {
    const { customerDetails, items } = req.body;

    if (!customerDetails || !items || items.length === 0) {
      return res
        .status(400)
        .json({ message: "অর্ডার ডিটেইলস বা কার্ট আইটেম খালি হতে পারে না" });
    }

    let calculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          message: `প্রোডাক্ট আইডি ${item.product} খুঁজে পাওয়া যায়নি`,
        });
      }
      if (!product.inStock) {
        return res
          .status(400)
          .json({ message: `দুঃখিত, ${product.name} এখন স্টক আউট আছে` });
      }

      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      });
    }

    // Make Order Document
    const newOrder = await Order.create({
      user: req.user ? req.user._id : null,
      customerDetails,
      items: orderItems,
      totalAmount: calculatedTotal,
    });

    res.status(201).json({
      message: "আলহামদুলিল্লাহ, আপনার অর্ডারটি সফলভাবে রিসিভ হয়েছে।",
      orderId: newOrder._id,
      totalAmount: newOrder.totalAmount,
      data: newOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get All Pending Orders (Admin Only View)
const getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await Order.find({ orderStatus: "pending" })
      .populate("items.product", "name price image")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      totalPending: pendingOrders.length,
      data: pendingOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update (Approve) an Order
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(orderStatus)) {
      return res
        .status(400)
        .json({ message: "অপ্রত্যাশিত বা অবৈধ অর্ডার স্ট্যাটাস" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { orderStatus } },
      { new: true, runValidators: true },
    ).populate("items.product", "name price");

    if (!updatedOrder) {
      return res.status(404).json({ message: "অর্ডারটি খুঁজে পাওয়া যায়নি" });
    }

    // ফিউচার বিকাশ ইন্টিগ্রেশনের সুবিধার্থে: যদি অর্ডার ডেলিভারড হয়ে যায়, তবে পেমেন্ট স্ট্যাটাসও পেইড করে দেওয়া
    if (
      orderStatus === "delivered" &&
      updatedOrder.paymentDetails.status === "unpaid"
    ) {
      updatedOrder.paymentDetails.status = "paid";
      await updatedOrder.save();
    }

    res.status(200).json({
      message: `অর্ডার স্ট্যাটাস সফলভাবে '${orderStatus}' এ পরিবর্তন করা হয়েছে।`,
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Delete Order
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "অর্ডারটি খুঁজে পাওয়া যায়নি" });
    }

    await order.deleteOne();
    res
      .status(200)
      .json({ message: "অর্ডারটি সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  placeOrder,
  getPendingOrders,
  updateOrderStatus,
  deleteOrder,
};
