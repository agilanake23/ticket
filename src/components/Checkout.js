// src/components/Checkout.js
import React from "react";
import "./../App.css";

export default function Checkout({ booking, show, onBack }) {
  if (!booking) return null;
  return (
    <div className="checkout-shell">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="checkout-card">
        <h2>Booking Confirmed</h2>
        <div className="confirm-id">{booking.bookingId}</div>
        <div className="confirm-meta">
          <strong>{show.title}</strong>
          <div>Seats: {booking.seats.join(", ")}</div>
          <div>Booked by: {booking.name}</div>
          <div>Total: ₹{booking.seats.length * show.price}</div>
        </div>
        <div className="done-note">This booking is saved locally. Open another tab to see realtime seat updates.</div>
      </div>
    </div>
  );
}
