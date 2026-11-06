import express from "express";
import {
  vendorGoogle,
  vendorSignin,
  vendorSignout,
  vendorSignup,
} from "../controllers/vendorControllers/vendorController.js";
import { multerMultipleUploads } from "../utils/multer.js";
import {
  showVendorVehicles,
  vendorAddVehicle,
  vendorDeleteVehicles,
  vendorEditVehicles,
} from "../controllers/vendorControllers/vendorCrudController.js";
import { vendorBookings } from "../controllers/vendorControllers/vendorBookingsController.js";
import { verifyToken } from "../utils/verifyUser.js";
import { requireVendor } from "../utils/authorization.js";

const router = express.Router();

// Public vendor authentication endpoints.
router.post("/vendorsignup", vendorSignup);
router.post("/vendorsignin", vendorSignin);
router.post("/vendorgoogle", vendorGoogle);

// All vendor data and mutation endpoints require a verified vendor session.
router.use(verifyToken, requireVendor);

router.get("/vendorsignout", vendorSignout);
router.post("/vendorAddVehicle", multerMultipleUploads, vendorAddVehicle);
router.post("/showVendorVehilces", showVendorVehicles);
router.put("/vendorEditVehicles/:id", vendorEditVehicles);
router.delete("/vendorDeleteVehicles/:id", vendorDeleteVehicles);
router.post("/vendorBookings", vendorBookings);

export default router;
