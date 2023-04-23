const foodItems = require('../../models/food-item/food-item.model');
const { uploadImageToCloudinary } = require('../../services/cloudinary');
const validator = require('../../utils/validator');
const foodItemValidatorSchema = require('./food-item.validator');

async function getAllFoodItems(req, res) {
  try {
    const { authUser, query } = req;

    const { searchBy = 'title', search = '' } = query;

    const allFoodItems = await foodItems
      .find({
        caterer: { _id: authUser },
        [searchBy]: { $regex: search, $options: 'i' },
      })
      .populate('category');

    return res.status(200).json(allFoodItems);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
}

async function createNewFoodItem(req, res) {
  try {
    const { authUser, body } = req;

    if (!authUser) return res.status(404).json('User not found');

    const { error } = validator(foodItemValidatorSchema, body);

    if (error) return res.status(400).json(error.message);

    const { secure_url } = await uploadImageToCloudinary(body.imgUrl);

    const foodItemCreds = {
      ...body,
      caterer: authUser,
      imgUrl: secure_url,
    };

    const newFoodItem = await foodItems.create(foodItemCreds);

    await newFoodItem.populate('category');

    return res.status(201).json(newFoodItem);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
}

module.exports = {
  getAllFoodItems,
  createNewFoodItem,
};
