// src/App.js
import React, { useState } from "react";
import CONTENT from "./data/content";
import SeatSelector from "./components/SeatSelector";
import Checkout from "./components/Checkout";
import "./App.css";

export default function App() {
  const [filter, setFilter] = useState("all"); // all | movie | webseries
  const [activeShow, setActiveShow] = useState(null);
  const [booking, setBooking] = useState(null);

  const list = CONTENT.filter((c) => (filter === "all" ? true : c.type === filter));

  const onStart = (show) => {
    setActiveShow(show);
    setBooking(null);
  };

  const onCancel = () => {
    setActiveShow(null);
    setBooking(null);
  };

  const onContinue = (bk) => {
    // bk: { seats, bookingId, name }
    setBooking(bk);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <center></center>
          <div className="logo">DNC..Rasipuram..</div>
          <div className="tag">Colorful · Fast · Real-time .best sound experience</div>
        </div>

        <div className="controls">
          <div className="filter">
            <button className={`chip ${filter==="all"?"active":""}`} onClick={()=>setFilter("all")}>All</button>
            <button className={`chip ${filter==="movie"?"active":""}`} onClick={()=>setFilter("movie")}>Movies</button>
            <button className={`chip ${filter==="webseries"?"active":""}`} onClick={()=>setFilter("webseries")}>Web Series</button>
          </div>
        </div>
      </header>

      <main className="main-area">
        {/* left: list */}
        <section className="list-panel">
          <div className="grid">
            {list.map((item) => (
              <div key={item.id} className="card">
                <img className="poster" src={item.poster} alt={item.title} />
                <div className="card-body">
                  <div className="title">{item.title}</div>
                  <div className="meta">{item.type === "movie" ? item.runtime : `${item.seasons} seasons`}</div>
                  <div className="price">₹{item.price}</div>
                  <div className="cta-row">
                    <button className="btn" onClick={() => onStart(item)}>Book Seats</button>
                    <button className="btn ghost" onClick={() => { alert(`${item.title}\nPrice: ₹${item.price}`); }}>Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* right: selector / checkout */}
        <aside className="panel-side">
          {!activeShow && <div className="side-empty">Select a show to book seats. Open multiple tabs to test realtime locking.</div>}

          {activeShow && !booking && (
            <SeatSelector
              show={activeShow}
              onContinue={(bk) => {
                onContinue(bk);
              }}
              onCancel={() => onCancel()}
            />
          )}

          {activeShow && booking && <Checkout booking={booking} show={activeShow} onBack={() => { setBooking(null); }} />}
        </aside>
      </main>

      <footer className="app-footer">Built for demo • Realtime seat locking via BroadcastChannel • Local persistence</footer>
    </div>
  );
}
