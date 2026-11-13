import Booking from "../../models/BookingModel.js";
import { errorHandler } from "../../utils/error.js";

export const vendorBookings = async (req, res, next) => {
  try {
    const vendorId = req.user?._id;
    if (!vendorId) {
      return next(errorHandler(401, "Authentication required"));
    }

    const bookings = await Booking.aggregate([
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "vehicleDetails",
        },
      },
      {
        $unwind: {
          path: "$vehicleDetails",
        },
      },
      {
        $match: {
          "vehicleDetails.addedBy": String(vendorId),
          "vehicleDetails.isAdminAdded": false,
        },
      },
    ]);

    return res.status(200).json(bookings);
  } catch (error) {
    return next(errorHandler(500, "error in vendorBookings"));
  }
};
