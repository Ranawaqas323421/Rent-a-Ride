import User from "../../models/userModel.js";
import { errorHandler } from "../../utils/error.js";

//user profile update

export const editUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!req.user || String(req.user._id) !== String(userId)) {
      return next(errorHandler(403, "You can only update your own profile"));
    }
    const updatedProfileData = req.body.formData;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          username: updatedProfileData.username,
          email: updatedProfileData.email,
          phoneNumber: updatedProfileData.phoneNumber,
          adress: updatedProfileData.adress,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(409).json({ message: "data not updated", updatedUser });
    }
    const { password, ...rest } = await updatedUser._doc;
    await res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};
