// src/components/SeatSelector.js
import React, { useEffect, useState, useRef } from "react";
import "./../App.css";

/*
 Real-time seat locking:
 - Uses BroadcastChannel to inform other tabs/windows of locks and bookings.
 - Persists final bookings in localStorage under key `bookings`.
 - Each client has a random clientId to identify locks from self vs others.
*/

const CHANNEL_NAME = "ticket_channel_v1";

function makeClientId() {
  return "c_" + Math.random().toString(36).slice(2, 9);
}

export default function SeatSelector({ show, onContinue, onCancel }) {
  const seatsCount = 50; // 5 rows x 10 cols
  const bcRef = useRef(null);
  const clientIdRef = useRef(makeClientId());
  const [selected, setSelected] = useState([]); // seats selected by this client
  const [lockedMap, setLockedMap] = useState({}); // { seatNumber: { clientId, ts } }
  const [bookedMap, setBookedMap] = useState({}); // seatNumber: true

  // helper localStorage key specific to this show
  const bookingsKey = `bookings_${show.id}`;

  // initialize BroadcastChannel and local states
  useEffect(() => {
    bcRef.current = new BroadcastChannel(CHANNEL_NAME);

    const onMessage = (ev) => {
      const msg = ev.data;
      if (!msg || msg.showId !== show.id) return;

      if (msg.type === "lock") {
        setLockedMap((prev) => ({ ...prev, [msg.seat]: { clientId: msg.clientId, ts: msg.ts } }));
      } else if (msg.type === "unlock") {
        setLockedMap((prev) => {
          const copy = { ...prev };
          delete copy[msg.seat];
          return copy;
        });
      } else if (msg.type === "book") {
        setBookedMap((prev) => ({ ...prev, [msg.seat]: true }));
        // remove any locks for booked seats
        setLockedMap((prev) => {
          const copy = { ...prev };
          delete copy[msg.seat];
          return copy;
        });
        // persist to localStorage
        const existing = JSON.parse(localStorage.getItem(bookingsKey) || "[]");
        if (!existing.includes(msg.seat)) {
          existing.push(msg.seat);
          localStorage.setItem(bookingsKey, JSON.stringify(existing));
        }
      } else if (msg.type === "sync_request") {
        // another client asking for current locks/bookings => respond with current bookings
        const existing = JSON.parse(localStorage.getItem(bookingsKey) || "[]");
        bcRef.current.postMessage({ type: "sync_response", showId: show.id, bookings: existing, from: clientIdRef.current });
      } else if (msg.type === "sync_response") {
        if (msg.bookings && Array.isArray(msg.bookings)) {
          // mark them booked
          const newBooked = {};
          msg.bookings.forEach((s) => (newBooked[s] = true));
          setBookedMap((prev) => ({ ...prev, ...newBooked }));
        }
      }
    };

    bcRef.current.addEventListener("message", onMessage);

    // on mount: load persisted bookings and request sync
    const persisted = JSON.parse(localStorage.getItem(bookingsKey) || "[]");
    const pm = {};
    persisted.forEach((s) => (pm[s] = true));
    setBookedMap(pm);

    // ask others for data
    bcRef.current.postMessage({ type: "sync_request", showId: show.id, from: clientIdRef.current });

    return () => {
      // unlock any seats we've locked when we leave
      const sel = selected.slice();
      sel.forEach((seat) => {
        bcRef.current.postMessage({ type: "unlock", showId: show.id, seat, clientId: clientIdRef.current });
      });
      bcRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show.id]);

  // when selected changed, lock/unlock seats
  useEffect(() => {
    const bc = bcRef.current;
    if (!bc) return;

    // build set of seats we hold locally in lockedMap where clientId === us
    // compare previous selected to current to send lock/unlock messages accordingly
    // simple approach: when user selects a seat, immediately send lock; when deselect, send unlock.
    // We send lock on toggle action below.
  }, [selected]);

  const toggleSeat = (n) => {
    // ignore if already booked
    if (bookedMap[n]) return;

    // if seat locked by other client, block
    const lock = lockedMap[n];
    if (lock && lock.clientId !== clientIdRef.current) {
      // cannot select
      return;
    }

    if (selected.includes(n)) {
      // deselect -> unlock
      setSelected((p) => p.filter((x) => x !== n));
      bcRef.current.postMessage({ type: "unlock", showId: show.id, seat: n, clientId: clientIdRef.current });
      // remove from local lockedMap
      setLockedMap((prev) => {
        const copy = { ...prev };
        delete copy[n];
        return copy;
      });
    } else {
      // select -> lock
      setSelected((p) => [...p, n]);
      setLockedMap((prev) => ({ ...prev, [n]: { clientId: clientIdRef.current, ts: Date.now() } }));
      bcRef.current.postMessage({ type: "lock", showId: show.id, seat: n, clientId: clientIdRef.current, ts: Date.now() });
    }
  };

  const confirmBooking = (name) => {
    // mark seats booked, broadcast each seat booked
    selected.forEach((s) => {
      bcRef.current.postMessage({ type: "book", showId: show.id, seat: s, clientId: clientIdRef.current });
      // persist locally
      const existing = JSON.parse(localStorage.getItem(bookingsKey) || "[]");
      if (!existing.includes(s)) {
        existing.push(s);
        localStorage.setItem(bookingsKey, JSON.stringify(existing));
      }
    });

    // create simple booking record in localStorage for history
    const historyKey = `booking_history_${show.id}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    history.unshift({ id: "BKG-" + Math.random().toString(36).slice(2, 8).toUpperCase(), name: name || "Guest", seats: selected, ts: Date.now() });
    localStorage.setItem(historyKey, JSON.stringify(history));

    onContinue({ seats: selected, bookingId: history[0].id, name: name || "Guest" });

    // clear our selected
    setSelected([]);
  };

  const renderSeat = (n) => {
    const isBooked = !!bookedMap[n];
    const lock = lockedMap[n];
    const isLockedByOther = lock && lock.clientId !== clientIdRef.current;
    const isSelected = selected.includes(n);

    let cls = "seat";
    if (isBooked) cls += " seat-booked";
    else if (isSelected) cls += " seat-selected";
    else if (isLockedByOther) cls += " seat-locked";

    return (
      <button
        key={n}
        className={cls}
        onClick={() => toggleSeat(n)}
        disabled={isBooked || isLockedByOther}
        title={isBooked ? "Booked" : isLockedByOther ? "Locked by another user" : `Seat ${n}`}
      >
        {n}
      </button>
    );
  };

  return (
    <div className="selector-shell">
      <div className="selector-header">
        <div>
          <button className="back-btn" onClick={onCancel}>← Back</button>
        </div>
        <div className="show-info">
          <h3>{show.title}</h3>
          <div className="meta">{show.type.toUpperCase()} • {show.runtime || (`${show.seasons} seasons`) } • ₹{show.price}</div>
        </div>
      </div>

      <div className="screen">SCREEN</div>

      <div className="seat-grid">
        {Array.from({ length: seatsCount }, (_, i) => i + 1).map(renderSeat)}
      </div>

      <div className="selector-footer">
        <div className="legend">
          <div><span className="legend-box seat-available" /> Available</div>
          <div><span className="legend-box seat-selected" /> Yours</div>
          <div><span className="legend-box seat-locked" /> Locked</div>
          <div><span className="legend-box seat-booked" /> Booked</div>
        </div>

        <div className="selected-info">
          Selected: {selected.length} seat(s)
          <div className="selected-list">{selected.join(", ") || "None"}</div>
        </div>

        <div className="action-row">
          <input type="text" placeholder="Your name (optional)" id="buyerName" className="name-input" />
          <button className="confirm-btn" onClick={() => {
            const name = document.getElementById("buyerName")?.value || "Guest";
            if (selected.length === 0) return alert("Select seats first");
            confirmBooking(name);
          }}>Confirm & Pay</button>
        </div>
      </div>
    </div>
  );
}
