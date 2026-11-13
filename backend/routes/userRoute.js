import express from "express";

import { verifyToken } from "../utils/verifyUser.js";
import { requireUser } from "../utils/authorization.js";
import { updateUser, deleteUser, signOut } from "../controllers/userControllers/userController.js";
import { listAllVehicles, showVehicleDetails } from "../controllers/userControllers/userAllVehiclesController.js";
import { editUserProfile } from "../controllers/userControllers/userProfileController.js";
import {
  BookCar,
  razorpayOrder,
  getVehiclesWithoutBooking,
  filterVehicles,
  showOneofkind,
  showAllVariants,
  findBookingsOfUser,
  sendBookingDetailsEamil,
  latestbookings,
} from "../controllers/userControllers/userBookingController.js";

const router = express.Router();

// Public catalogue and availability discovery endpoints.
router.get("/listAllVehicles", listAllVehicles);
router.post("/showVehicleDetails", showVehicleDetails);
router.post("/filterVehicles", filterVehicles);
router.post("/getVehiclesWithoutBooking", getVehiclesWithoutBooking, showAllVariants);
router.post("/showSingleofSameModel", getVehiclesWithoutBooking, showOneofkind);

// All account and booking operations require a verified user session.
router.post("/update/:id", verifyToken, requireUser, updateUser);
router.delete("/delete/:id", verifyToken, requireUser, deleteUser);
router.get("/signout", verifyToken, requireUser, signOut);
router.post("/editUserProfile/:id", verifyToken, requireUser, editUserProfile);
router.post("/razorpay", verifyToken, requireUser, razorpayOrder);
router.post("/bookCar", verifyToken, requireUser, BookCar);
router.post("/findBookingsOfUser", verifyToken, requireUser, findBookingsOfUser);
router.post("/latestbookings", verifyToken, requireUser, latestbookings);
router.post("/sendBookingDetailsEamil", verifyToken, requireUser, sendBookingDetailsEamil);

export default router;
