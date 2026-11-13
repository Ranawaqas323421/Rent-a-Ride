import mongoose from "mongoose";
import crypto from "node:crypto";
import Booking from "../../models/BookingModel.js";
import { errorHandler } from "../../utils/error.js";
import Razorpay from "razorpay";
import { availableAtDate } from "../../services/checkAvailableVehicle.js";
import Vehicle from "../../models/vehicleModel.js";
import nodemailer from "nodemailer";

export const BookCar = async (req, res, next) => {
  try {
    const {
      user_id,
      vehicle_id,
      totalPrice,
      pickupDate,
      dropoffDate,
      pickup_location,
      dropoff_location,
      pickup_district,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body || {};

    const authenticatedUserId = req.user?._id;
    if (!authenticatedUserId) {
      return next(errorHandler(401, "Authentication required"));
    }

    // Keep the existing client field for compatibility, but never use it as
    // the source of the booking owner.
    if (
      user_id &&
      (!mongoose.Types.ObjectId.isValid(user_id) ||
        String(user_id) !== String(authenticatedUserId))
    ) {
      return next(errorHandler(403, "Booking user does not match authenticated account"));
    }

    const normalizedPickupLocation =
      typeof pickup_location === "string" ? pickup_location.trim() : "";
    const normalizedPickupDistrict =
      typeof pickup_district === "string" ? pickup_district.trim() : "";
    const normalizedDropoffLocation =
      typeof dropoff_location === "string" ? dropoff_location.trim() : "";
    const amount = Number(totalPrice);
    const amountInPaise = Math.round(amount * 100);
    if (
      !vehicle_id ||
      !pickupDate ||
      !dropoffDate ||
      typeof pickup_location !== "string" ||
      !pickup_location.trim() ||
      typeof dropoff_location !== "string" ||
      !dropoff_location.trim() ||
      typeof pickup_district !== "string" ||
      !pickup_district.trim() ||
      typeof razorpayPaymentId !== "string" ||
      !razorpayPaymentId.trim() ||
      typeof razorpayOrderId !== "string" ||
      !razorpayOrderId.trim() ||
      typeof razorpaySignature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(razorpaySignature) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(amountInPaise)
    ) {
      return next(errorHandler(400, "Missing or invalid booking/payment details"));
    }

    if (!mongoose.Types.ObjectId.isValid(vehicle_id)) {
      return next(errorHandler(400, "Invalid vehicle ID"));
    }

    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    if (
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(dropoff.getTime()) ||
      pickup >= dropoff
    ) {
      return next(errorHandler(400, "Invalid pickup/drop-off date range"));
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      return next(errorHandler(503, "Payment service is not configured"));
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicle_id,
      isDeleted: "false",
      isAdminApproved: true,
    }).lean();

    if (!vehicle) {
      return next(errorHandler(404, "Vehicle is not available"));
    }

    if (
      vehicle.location !== normalizedPickupLocation ||
      vehicle.district !== normalizedPickupDistrict
    ) {
      return next(errorHandler(400, "Pickup location does not match the selected vehicle"));
    }

    const availableVehicles = await availableAtDate(pickup, dropoff);
    if (!availableVehicles.some((availableVehicle) => String(availableVehicle._id) === String(vehicle_id))) {
      return next(errorHandler(409, "Vehicle is no longer available for the selected dates"));
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(razorpaySignature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return next(errorHandler(400, "Payment signature verification failed"));
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
    const order = await razorpay.orders.fetch(razorpayOrderId);
    const orderNotes = order.notes || {};

    if (
      order.amount !== amountInPaise ||
      order.currency !== "INR" ||
      orderNotes.userId !== String(authenticatedUserId) ||
      orderNotes.vehicleId !== String(vehicle_id) ||
      orderNotes.pickupDate !== pickup.toISOString() ||
      orderNotes.dropoffDate !== dropoff.toISOString() ||
      orderNotes.pickupLocation !== normalizedPickupLocation ||
      orderNotes.pickupDistrict !== normalizedPickupDistrict ||
      orderNotes.dropoffLocation !== normalizedDropoffLocation
    ) {
      return next(errorHandler(400, "Payment order does not match this booking"));
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (
      payment.status !== "captured" ||
      payment.order_id !== razorpayOrderId ||
      payment.amount !== amountInPaise ||
      payment.currency !== "INR"
    ) {
      return next(errorHandler(400, "Payment is not captured for this booking amount"));
    }

    const existingBooking = await Booking.findOne({
      $or: [
        { razorpayPaymentId },
        { razorpayOrderId },
      ],
    }).lean();

    if (existingBooking) {
      return next(errorHandler(409, "This payment has already been used for a booking"));
    }

    const book = new Booking({
      pickupDate: pickup,
      dropOffDate: dropoff,
      userId: authenticatedUserId,
      pickUpLocation: normalizedPickupLocation,
      vehicleId: vehicle_id,
      dropOffLocation: normalizedDropoffLocation,
      pickUpDistrict: normalizedPickupDistrict,
      totalPrice: amount,
      razorpayPaymentId,
      razorpayOrderId,
      status: "booked",
    });

    const booked = await book.save();
    return res.status(200).json({
      message: "car booked successfully",
      booked,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "This payment has already been used for a booking"));
    }
    return next(errorHandler(500, "error while booking car"));
  }
};

//createing razorpay instance
export const razorpayOrder = async (req, res, next) => {
  try {
    const {
      totalPrice,
      dropoff_location,
      pickup_district,
      pickup_location,
      vehicle_id,
      pickupDate,
      dropoffDate,
    } = req.body || {};

    const amount = Number(totalPrice);
    const amountInPaise = Math.round(amount * 100);

    if (
      !vehicle_id ||
      !pickupDate ||
      !dropoffDate ||
      typeof dropoff_location !== "string" ||
      !dropoff_location.trim() ||
      typeof pickup_district !== "string" ||
      !pickup_district.trim() ||
      typeof pickup_location !== "string" ||
      !pickup_location.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(amountInPaise)
    ) {
      return next(errorHandler(400, "Missing or invalid payment details"));
    }

    if (!mongoose.Types.ObjectId.isValid(vehicle_id)) {
      return next(errorHandler(400, "Invalid vehicle ID"));
    }

    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    if (
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(dropoff.getTime()) ||
      pickup >= dropoff
    ) {
      return next(errorHandler(400, "Invalid pickup/drop-off date range"));
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      return next(errorHandler(503, "Payment service is not configured"));
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicle_id,
      isDeleted: "false",
      isAdminApproved: true,
    }).lean();

    if (!vehicle) {
      return next(errorHandler(404, "Vehicle is not available"));
    }

    if (
      vehicle.location !== pickup_location ||
      vehicle.district !== pickup_district
    ) {
      return next(errorHandler(400, "Pickup location does not match the selected vehicle"));
    }

    const availableVehicles = await availableAtDate(pickup, dropoff);
    if (!availableVehicles.some((availableVehicle) => String(availableVehicle._id) === String(vehicle_id))) {
      return next(errorHandler(409, "Vehicle is not available for the selected dates"));
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const order = await instance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      notes: {
        userId: String(req.user._id),
        vehicleId: String(vehicle_id),
        pickupDate: pickup.toISOString(),
        dropoffDate: dropoff.toISOString(),
        pickupLocation: pickup_location.trim(),
        pickupDistrict: pickup_district.trim(),
        dropoffLocation: dropoff_location.trim(),
      },
    });

    if (!order) {
      return next(errorHandler(502, "Payment order could not be created"));
    }

    return res.status(200).json(order);
  } catch (error) {
    return next(errorHandler(502, "Payment service error while creating order"));
  }
};

// -------------------- -------------------

// getting vehicles without booking for selected Date and location
export const getVehiclesWithoutBooking = async (req, res, next) => {
  try {
    const { pickUpDistrict, pickUpLocation, pickupDate, dropOffDate, model } =
      req.body;

    if (!pickUpDistrict || !pickUpLocation)
      return next(errorHandler(409, "pickup District and location needed"));

    if (!pickupDate || !dropOffDate)
      return next(errorHandler(409, "pickup , dropffdate  is required"));

    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropOffDate);
    if (
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(dropoff.getTime()) ||
      pickup >= dropoff
    ) {
      return next(errorHandler(400, "Invalid date range"));
    }

    const vehiclesAvailableAtDate = await availableAtDate(pickup, dropoff);

    if (!vehiclesAvailableAtDate || vehiclesAvailableAtDate.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vehicles available for the specified time period.",
      });
    }

    const availableVehicles = vehiclesAvailableAtDate.filter(
      (cur) =>
        cur.district === pickUpDistrict &&
        cur.location == pickUpLocation &&
        cur.isDeleted === "false"
    );

    if (availableVehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vehicles available at this location.",
      });
    }

    // If there is no next middleware after this one, send the response
    if (!req.route || !req.route.stack || req.route.stack.length === 1) {
      console.log("hello");
      console.log({ success: "true", data: availableVehicles });
      return res.status(200).json({
        success: true,
        data: availableVehicles,
      });
    }

    // If there is a next middleware, pass control to it
    res.locals.actionResult = [availableVehicles, model];
    next();
  } catch (error) {
    console.log(error);
    return next(
      errorHandler(500, "An error occurred while fetching available vehicles.")
    );
  }
};

//getting all variants of a model which are not booked
export const showAllVariants = async (req, res, next) => {
  try {
    const actionResult = res.locals.actionResult;
    const model = actionResult[1];

    if (!actionResult[0]) {
      next(errorHandler(404, "no actionResult"));
    }
    const allVariants = actionResult[0].filter((cur) => {
      return cur.model === model;
    });

    res.status(200).json(allVariants);
  } catch (error) {
    next(errorHandler(500, "internal error in showAllVariants"));
  }
};

//show i if more vehcles with same model available
export const showOneofkind = async (req, res, next) => {
  try {
    const actionResult = res.locals.actionResult;

    const modelsMap = {};
    const singleVehicleofModel = [];

    if (!actionResult) {
      next(errorHandler(404, "no actionResult"));
      return;
    }

    actionResult[0].forEach((cur) => {
      if (!modelsMap[cur.model]) {
        modelsMap[cur.model] = true;
        singleVehicleofModel.push(cur);
      }
    });

    if (!singleVehicleofModel) {
      next(errorHandler(404, "no vehicles available"));
      return;
    }

    res.status(200).json(singleVehicleofModel);
  } catch (error) {
    console.log(error);
    next(errorHandler(500, "error in showOneofkind"));
  }
};

//  filtering vehicles
export const filterVehicles = async (req, res, next) => {
  try {
    const transformedData = req.body;
    if (
      !Array.isArray(transformedData) ||
      transformedData.length > 20 ||
      !transformedData.every(
        (filter) =>
          filter &&
          typeof filter === "object" &&
          !Array.isArray(filter) &&
          ["car_type", "transmition"].includes(filter.type)
      )
    ) {
      return next(errorHandler(400, "Invalid vehicle filter options"));
    }
    const generateMatchStage = (data) => {
      const carTypes = [];
      data.forEach((cur) => {
        if (cur.type === "car_type") {
          // Extract the first key of the object and push it into 'cartypes' array
          const firstKey = Object.keys(cur).find((key) => key !== "type");
          if (firstKey) {
            carTypes.push(firstKey);
          }
        }
      });

      const transmitions = [];
      data.forEach((cur) => {
        // If the current element has type equal to 'transmition'
        if (cur.type === "transmition") {
          // Iterate through each key of the current element
          Object.keys(cur).forEach((key) => {
            // Exclude the 'type' key and push only keys with truthy values into 'transmitions' array
            if (key !== "type" && cur[key]) {
              transmitions.push(key);
            }
          });
        }
      });

      return {
        $match: {
          $and: [
            { isDeleted: "false" },
            { isAdminApproved: true },
            carTypes.length > 0 ? { car_type: { $in: carTypes } } : null,
            transmitions.length > 0
              ? { transmition: { $in: transmitions } }
              : null,
          ].filter((condition) => condition !== null), // Remove null conditions
        },
      };
    };

    const matchStage = generateMatchStage(transformedData);

    const filteredVehicles = await Vehicle.aggregate([matchStage]);
    if (!filteredVehicles) {
      next(errorHandler(401, "no vehicles found"));
      return;
    }
    res.status(200).json({
      status: "success",
      data: {
        filteredVehicles,
      },
    });
  } catch (error) {
    console.log(error);
    next(errorHandler(500, "internal server error in fiilterVehicles"));
  }
};

export const findBookingsOfUser = async (req, res, next) => {
  try {
    const convertedUserId = req.user?._id;
    if (!convertedUserId) return next(errorHandler(401, "Authentication required"));

    const bookings = await Booking.aggregate([
      {
        $match: {
          userId: convertedUserId,
        },
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "result",
        },
      },
      {
        $project: {
          _id: 0,
          bookingDetails: "$$ROOT",
          vehicleDetails: {
            $arrayElemAt: ["$result", 0],
          },
        },
      },
    ]);

    res.status(200).json(bookings);
  } catch (error) {
    console.log(error);
    next(errorHandler(500, "internal error in findBookingOfUser"));
  }
};

//api to ge the latestbookings details
export const latestbookings = async (req, res, next) => {
  try {
    const convertedUserId = req.user?._id;
    if (!convertedUserId) return next(errorHandler(401, "Authentication required"));

    const bookings = await Booking.aggregate([
      {
        $match: {
          userId: convertedUserId,
        },
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "_id",
          as: "result",
        },
      },
      {
        $project: {
          _id: 0,
          bookingDetails: "$$ROOT",
          vehicleDetails: {
            $arrayElemAt: ["$result", 0],
          },
        },
      },
      {
        $sort:
          /**
           * Provide any number of field/order pairs.
           */
          {
            "bookingDetails.createdAt": -1,
          },
      },
      {
        $limit:
          /**
           * Provide the number of documents to limit.
           */
          1,
      },
    ]);

    if (!bookings) {
      res.status(404, "error no such booking");
    }

    res.status(200).json(bookings);
  } catch (error) {
    console.log(error);
    next(errorHandler(500, "internal server error in latestbookings"));
  }
};

//send booking details to user email
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

// Send only the authenticated user's persisted booking details to their
// account email. Client-supplied recipient and HTML data are never trusted.
export const sendBookingDetailsEamil = async (req, res, next) => {
  try {
    const bookingId =
      req.body?.bookingId ||
      req.body?.data?.[0]?.bookingDetails?._id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return next(errorHandler(400, "A valid booking ID is required"));
    }

    if (!req.user?.email) {
      return next(errorHandler(400, "Account email is not available"));
    }

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PASSWORD) {
      return next(errorHandler(503, "Email service is not configured"));
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user._id,
    }).lean();

    if (!booking) {
      return next(errorHandler(404, "Booking not found for this account"));
    }

    const vehicleDetails = await Vehicle.findById(booking.vehicleId).lean();
    if (!vehicleDetails) {
      return next(errorHandler(404, "Vehicle details for this booking were not found"));
    }

    const pickupDate = new Date(booking.pickupDate).toLocaleString();
    const dropOffDate = new Date(booking.dropOffDate).toLocaleString();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 10px;">
        <h2>Booking Details</h2>
        <hr>
        <p><strong>Booking Id:</strong> ${escapeHtml(booking._id)}</p>
        <p><strong>Total Amount:</strong> ${escapeHtml(booking.totalPrice)}</p>
        <p><strong>Pickup Location:</strong> ${escapeHtml(booking.pickUpLocation)}</p>
        <p><strong>Pickup Date:</strong> ${escapeHtml(pickupDate)}</p>
        <p><strong>Dropoff Location:</strong> ${escapeHtml(booking.dropOffLocation)}</p>
        <p><strong>Dropoff Date:</strong> ${escapeHtml(dropOffDate)}</p>
        <h2>Vehicle Details</h2>
        <hr>
        <p><strong>Vehicle Number:</strong> ${escapeHtml(vehicleDetails.registeration_number)}</p>
        <p><strong>Model:</strong> ${escapeHtml(vehicleDetails.model)}</p>
        <p><strong>Company:</strong> ${escapeHtml(vehicleDetails.company)}</p>
        <p><strong>Vehicle Type:</strong> ${escapeHtml(vehicleDetails.car_type)}</p>
        <p><strong>Seats:</strong> ${escapeHtml(vehicleDetails.seats)}</p>
        <p><strong>Fuel Type:</strong> ${escapeHtml(vehicleDetails.fuel_type)}</p>
        <p><strong>Transmission:</strong> ${escapeHtml(vehicleDetails.transmition)}</p>
        <p><strong>Manufacturing Year:</strong> ${escapeHtml(vehicleDetails.year_made)}</p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_HOST,
      to: req.user.email,
      subject: "rentaride.shop booking details",
      html,
    });

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    return next(errorHandler(502, "Unable to send booking details email"));
  }
};
