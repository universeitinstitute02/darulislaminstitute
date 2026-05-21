const Product = require("../models/Product");

// 1. Create a new Product (POST)
const createProduct = async (req, res) => {
  try {
    const { name, price, category, description, publisher, features, inStock } =
      req.body;
    const imageUrl = req.file ? req.file.path : null;

    if (!imageUrl)
      return res.status(400).json({ message: "প্রোডাক্ট ইমেজ প্রয়োজন" });

    const product = await Product.create({
      name,
      price,
      category,
      image: imageUrl,
      inStock: inStock === "true",
      details: {
        description,
        publisher,
        features:
          typeof features === "string" ? JSON.parse(features) : features,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get All Products (GET - Admin)
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Product for Shop page
const getShopData = async (req, res) => {
  try {
    const siteFeatures = [
      { id: 1, title: "১০০% অরিজিনাল", icon: "ShieldCheck" },
      { id: 2, title: "সহজ রিটার্ন", icon: "RefreshCcw" },
      { id: 3, title: "দ্রুত ডেলিভারি", icon: "Truck" },
    ];

    const products = await Product.find({}).sort({ createdAt: -1 });

    res.status(200).json({
      siteFeatures,
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        price: p.price,
        category: p.category,
        image: p.image,
        inStock: p.inStock,
        details: p.details,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Update a Product (PUT)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "প্রোডাক্ট পাওয়া যায়নি" });

    const { name, price, category, description, publisher, features, inStock } =
      req.body;

    const updatedData = {
      name: name || product.name,
      price: price || product.price,
      category: category || product.category,
      inStock: inStock !== undefined ? inStock === "true" : product.inStock,
      details: {
        description: description || product.details?.description,
        publisher: publisher || product.details?.publisher,
        features: features
          ? typeof features === "string"
            ? JSON.parse(features)
            : features
          : product.details?.features,
      },
    };

    if (req.file) updatedData.image = req.file.path;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true, runValidators: true },
    );

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Delete a Product (DELETE)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "প্রোডাক্ট পাওয়া যায়নি" });

    await product.deleteOne();
    res.status(200).json({ message: "প্রোডাক্ট সফলভাবে ডিলিট হয়েছে" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getShopData,
};
