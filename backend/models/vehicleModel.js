import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  registeration_number: {
    type: String,
    required: true,
    unique: true,
  },
  car_title: {
    type: String,
    required: false,
  },
  car_description: {
    type: String,
    required: false,
  },
  created_at: {
    type: String,
    required: false,
  },
  updated_at: {
    type: String,
    required: false,
  },
  remark: {
    type: String,
    required: false,
  },
  company: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: false,
  },
  model: {
    type: String,
    required: false,
  },
  year_made: {
    type: Number,
    required: false,
  },
  fuel_type: {
    // Keep "electirc" for compatibility with the existing frontend form values.
    type: String,
    enum: ["petrol", "diesel", "electirc", "hybrid"],
    required: false,
  },
  rented_by: {
    type: String,
    required: false,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    required: false,
  },
  seats: {
    type: Number,
    required: false,
  },
  transmition: {
    type: String,
    enum: ["manual", "automatic"],
  },
  image: {
    type: Array,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
  title: {
    type: String,
    required: false,
  },
  price: {
    type: Number,
    required: false,
    min: 0,
  },
  base_package: {
    type: String,
    required: false,
  },
  with_or_without_fuel: {
    type: Boolean,
    required: false,
  },
  insurance_end: {
    type: Date,
    required: false,
  },
  registeration_end: {
    type: Date,
    required: false,
  },
  pollution_end: {
    type: Date,
    required: false,
  },
  certificates: {
    fitness: {
      type: String,
      required: false,
    },
    registration: {
      type: String,
      required: false,
    },
    rc: {
      type: String,
      required: false,
    },
    pollution: {
      type: String,
      required: false,
    },
  },
  car_type: {
    type: String,
  },
  isDeleted: {
    // Existing controllers intentionally use the string values "true"/"false".
    type: String,
    enum: ["true", "false"],
    default: "false",
    required: false,
  },
  location: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  isAdminAdded: {
    type: Boolean,
    default: true,
  },
  addedBy: {
    type: String,
    default: "admin",
  },
  isAdminApproved: {
    type: Boolean,
    default: true,
  },
  isRejected: {
    type: Boolean,
    default: false,
  },
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;
