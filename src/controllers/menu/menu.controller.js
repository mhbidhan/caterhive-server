const menus = require('../../models/menu/menu.model');
const {
  menuValidatorSchema,
  reviewValidatorSchema,
} = require('./menu.validator');
const validator = require('../../utils/validator');
const { uploadImageToCloudinary } = require('../../services/cloudinary');
const errorMessages = require('../../utils/errorMessages');
const reviews = require('../../models/review/review.model');
const customers = require('../../models/customer/customer.model');

async function getMenusByCaterer(req, res) {
  try {
    const { authUser } = req;

    const allMenus = await menus.find({ caterer: { _id: authUser } });

    return res.status(200).json(allMenus);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
}

async function getMenuById(req, res) {
  try {
    const { id } = req.params;

    const menu = await menus
      .findById(id)
      .populate([
        { path: 'caterer' },
        { path: 'foodItems' },
        { path: 'reviews', populate: { path: 'user' } },
      ]);

    if (!menu) return res.status(404).json(errorMessages.notFound);

    return res.status(200).json(menu);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
}

async function createNewMenu(req, res) {
  try {
    const { authUser, body } = req;

    if (!authUser) return res.status(404).json('User not found');

    const { error } = validator(menuValidatorSchema, body);

    if (error) return res.status(400).json(error.message);

    const { secure_url } = await uploadImageToCloudinary(body.thumbnail);

    const menuCreds = {
      ...body,
      caterer: authUser,
      thumbnail: secure_url,
    };

    const newMenu = await menus.create(menuCreds);

    return res.status(201).json(newMenu);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
}

async function reviewMenuById(req, res) {
  try {
    const { authUser, params, body } = req;
    const { id } = params;

    const { error } = validator(reviewValidatorSchema, body);

    if (error) return res.status(400).json(error.message);

    const menu = await menus.findById(id);

    if (!menu) return res.status(404).json(errorMessages.notFound);

    const customer = await customers.findById(authUser);

    if (!customer) return res.status(404).json(errorMessages.accessDenied);

    const newReview = await reviews.create({
      user: authUser,
      createdAt: new Date().toISOString(),
      ...body,
    });

    menu.reviews.push(newReview._id);
    await menu.populate('reviews');

    menu.rating = (
      menu.reviews.reduce((acc, curr) => curr.rating + acc, 0) /
      +menu.reviews.length
    ).toFixed(2);

    await menu.save();

    await menu.populate([
      { path: 'caterer' },
      { path: 'foodItems' },
      { path: 'reviews', populate: { path: 'user' } },
    ]);
    return res.status(200).json(menu);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
}

module.exports = {
  getMenusByCaterer,
  getMenuById,
  createNewMenu,
  reviewMenuById,
};
