import mongoose from "mongoose";
import vehicle from "../../models/vehicleModel.js";
import Booking from "../../models/BookingModel.js";
import { errorHandler } from "../../utils/error.js";

//show all vehicles to user
export const listAllVehicles = async (req, res, next) => {
  try {
    const vehicles = await vehicle.find({
      isDeleted: "false",
      isAdminApproved: true,
    });

    if (!vehicles) {
      return next(errorHandler(404, "no vehicles found"));
    }
    res.status(200).json(vehicles);
  } catch (error) {
    console.log(error);
    next(errorHandler(500, "something went wrong"));
  }
};

//show one vehicle Detail to user
export const showVehicleDetails = async (req, res, next) => {
  try {
    const id = req.body?.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(errorHandler(400, "A valid vehicle ID is required"));
    }

    const vehicleDetail = await vehicle.findOne({
      _id: id,
      isDeleted: "false",
      isAdminApproved: true,
    });

    if (!vehicleDetail) {
      return next(errorHandler(404, "no vehicles found"));
    }

    res.status(200).json(vehicleDetail);
  } catch (error) {
    console.log(error);
    next(errorHandler(500, "something went wrong"));
  }
};

//check vehicle availabilitty
export const checkAvailability = async (req, res, next) => {
  try {
    if (!req.body) {
      return next(errorHandler(400, "Request body is required"));
    }

    const { pickupDate, dropOffDate, vehicleId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(vehicleId) ||
      !pickupDate ||
      !dropOffDate
    ) {
      return next(errorHandler(400, "Pickup date, drop-off date and a valid vehicle ID are required"));
    }

    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropOffDate);
    if (
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(dropoff.getTime()) ||
      pickup >= dropoff
    ) {
      return next(errorHandler(400, "Invalid date range"));
    }

    const existingBookings = await Booking.find({
      vehicleId,
      status: { $in: ["booked", "onTrip", "notPicked", "overDue"] },
      pickupDate: { $lt: dropoff },
      dropOffDate: { $gt: pickup },
    })
      .select("_id")
      .lean();

    if (existingBookings.length > 0) {
      return next(
        errorHandler(409, "Vehicle is not available for the specified time period")
      );
    }

    return res.status(200).json({
      message: "Vehicle is available for booking",
    });
  } catch (error) {
    console.error("Vehicle availability check failed:", error);
    return next(errorHandler(500, "Unable to check vehicle availability"));
  }
};

// ---------------------

//search car filter in homepage
export const searchCar = async (req, res, next) => {
  try {
    if (req && req.body) {
      const {
        pickup_district,
        pickup_location,
        dropoff_location,
        pickuptime,
        dropofftime,
      } = req.body;

      //checking if droOfftime is before or equals to pickupTime
      const pickuptimeDate = new Date(pickuptime.$d);
      const dropofftimeDate = new Date(dropofftime.$d);
      // Calculate the difference in milliseconds between two dates
      const dateDifferenceInMilliseconds =
        dropofftimeDate.getTime() - pickuptimeDate.getTime();
      // Convert milliseconds to days
      const dateDifferenceInDays =
        dateDifferenceInMilliseconds / (1000 * 60 * 60 * 24);

      if (dropofftime.$d <= pickuptime.$d || dateDifferenceInDays < 1) {
        return next(errorHandler(401, "dropoff date should be larger"));
      } else {
        const search = await vehicle.aggregate([
          {
            $match: {
              isDeleted: "false",
            },
          },
          {
            $match: {
              district: pickup_district,
              location: pickup_location,
              isBooked: false,
              isAdminApproved: true,
            },
          },
          {
            $group: {
              _id: {
                model: "$model",
                location: "$location",
                fuel_type: "$fuel_type",
                transmition: "$transmition",
                seats: "$seats",
              },
              vehicles: {
                $push: "$$ROOT",
              },
            },
          },
          {
            $project: {
              _id: 1,
              vehicles: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: "$vehicles",
                      },
                      1,
                    ],
                  },
                  then: {
                    $arrayElemAt: ["$vehicles", 0],
                  },
                  else: "$vehicles",
                },
              },
            },
          },
          {
            $unwind: {
              path: "$vehicles",
            },
          },
          {
            $replaceRoot: {
              newRoot: "$vehicles",
            },
          },
        ]);
        if (search) {
          res.status(200).json(search);
        } else {
          res.status(404).json({ message: "no car found" });
        }
      }
    } else {
      res.status(400).json({ message: "please provide all the details" });
    }
  } catch (error) {
    next(errorHandler(500, "something went wrong while Searching car"));
  }
};
