import express from "express";
import { adminProfiile } from "../controllers/adminControllers/adminController.js";
import { adminSignIn } from "../controllers/authController.js";
import { signOut } from "../controllers/userControllers/userController.js";
import {
  addProduct,
  deleteVehicle,
  editVehicle,
  showVehicles,
} from "../controllers/adminControllers/dashboardController.js";
import { multerUploads } from "../utils/multer.js";
import {
  insertDummyData,
  getCarModelData,
} from "../controllers/adminControllers/masterCollectionController.js";
import {
  approveVendorVehicleRequest,
  fetchVendorVehilceRequests,
  rejectVendorVehicleRequest,
} from "../controllers/adminControllers/vendorVehilceRequests.js";
import {
  allBookings,
  changeStatus,
} from "../controllers/adminControllers/bookingsController.js";
import { verifyToken } from "../utils/verifyUser.js";
import { requireAdmin } from "../utils/authorization.js";

const router = express.Router();

// Login is public but only an account with the admin role receives tokens.
router.post("/dashboard", adminSignIn);

// Every admin data or mutation endpoint is protected server-side.
router.use(verifyToken, requireAdmin);

router.post("/profile", adminProfiile);
router.get("/signout", signOut);
router.post("/addProduct", multerUploads, addProduct);
router.get("/showVehicles", showVehicles);
router.delete("/deleteVehicle/:id", deleteVehicle);
router.put("/editVehicle/:id", editVehicle);
router.get("/dummyData", insertDummyData);
router.get("/getVehicleModels", getCarModelData);
router.get("/fetchVendorVehilceRequests", fetchVendorVehilceRequests);
router.post("/approveVendorVehicleRequest", approveVendorVehicleRequest);
router.post("/rejectVendorVehicleRequest", rejectVendorVehicleRequest);
router.get("/allBookings", allBookings);
router.post("/changeStatus", changeStatus);

export default router;
