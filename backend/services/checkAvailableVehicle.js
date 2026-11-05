import Booking from "../models/BookingModel.js";
import Vehicle from "../models/vehicleModel.js";

//returning vehicles that are not booked in selected Date
export async function availableAtDate(pickupDate, dropOffDate) {
  const pickup = new Date(pickupDate);
  const dropoff = new Date(dropOffDate);

  if (
    Number.isNaN(pickup.getTime()) ||
    Number.isNaN(dropoff.getTime()) ||
    pickup >= dropoff
  ) {
    throw new Error("Invalid pickup and drop-off date range");
  }

  // Only active reservations block a vehicle. Cancelled/completed bookings
  // must not make a vehicle appear unavailable for the requested period.
  const activeBookings = await Booking.find(
    {
      status: { $in: ["booked", "onTrip", "notPicked", "overDue"] },
      pickupDate: { $lt: dropoff },
      dropOffDate: { $gt: pickup },
    },
    { vehicleId: 1 }
  ).lean();

  const bookedVehicleIds = activeBookings.map((booking) => booking.vehicleId);

  return Vehicle.find({
    _id: { $nin: bookedVehicleIds },
    isDeleted: "false",
    isAdminApproved: { $ne: false },
  });
}
