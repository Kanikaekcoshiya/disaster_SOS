import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import '../styles/VolunteerDashboard.css';

import SOSMap from "../components/SOSMap";

// const BACKEND_URL = "http://localhost:8080";
const BACKEND_URL = process.env.REACT_APP_API_URL;
const socket = io(BACKEND_URL);

const sortByLatest = (list) =>
  [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const VolunteerDashboard = () => {
  const [sosRequests, setSosRequests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedSos, setSelectedSos] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [chatMaximized, setChatMaximized] = useState(false);
  const [newSosId, setNewSosId] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('volunteerToken');
  const volunteerId = localStorage.getItem('volunteerId');
  const volunteerName = localStorage.getItem('volunteerName');

  // Redirect if not logged in
  useEffect(() => { if (!token) navigate('/login'); }, [navigate, token]);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setUserLocation({ latitude: coords.latitude, longitude: coords.longitude }),
        () => toast.warn("Unable to fetch your location. Map may not center on you."),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // Show Back to Top button on scroll
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

// Fetch SOS requests
const fetchSosRequests = useCallback(async () => {
  if (!token) return;

  try {
    const res = await axios.get(`${BACKEND_URL}/api/sos/my-sos`, {
      headers: { Authorization: `Bearer ${token}` },
    });


    const sorted = res.data.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    setSosRequests(sorted);

    sorted.forEach(sos => {
      const assignedToMe =
        sos.assignedVolunteer?._id === volunteerId ||
        sos.assignedVolunteer?.id === volunteerId;

      if (!sos.assignedVolunteer || assignedToMe) {
        socket.emit("joinSOSChat", sos._id);
      }
    });
  } catch (err) {
    console.error(err);
    toast.error("Failed to load SOS requests");
  }
}, [token, volunteerId]);



  // Socket listeners
  useEffect(() => {
    fetchSosRequests();

    
const handleNewSOS = (newSos) => {
  
  setSosRequests(prev =>
    [newSos, ...prev].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  );

  setSelectedSos(newSos);
  setNewSosId(newSos._id);

  setTimeout(() => setNewSosId(null), 4000);

  const assignedToMe =
    newSos.assignedVolunteer?._id === volunteerId ||
    newSos.assignedVolunteer?.id === volunteerId;

  if (!newSos.assignedVolunteer || assignedToMe)
    socket.emit("joinSOSChat", newSos._id);

  toast.info(` New SOS from ${newSos.name || "Anonymous"}`);
};

    const handleSOSStatusUpdated = (updatedSos) => {
  setSosRequests(prev =>
    sortByLatest(
      prev.map(sos =>
        sos._id === updatedSos._id ? updatedSos : sos
      )
    )
  );
  if (selectedSos?._id === updatedSos._id)
    setSelectedSos(updatedSos);
};


    const handleChatMessage = (data) => {
      setSosRequests(prev => prev.map(sos => sos._id === data.sosId ? { ...sos, chat: [...(sos.chat || []), data] } : sos));
      if (selectedSos?._id === data.sosId) setSelectedSos(prev => ({ ...prev, chat: [...(prev.chat || []), data] }));
    };

    socket.on("newSOS", handleNewSOS);
    socket.on("sosStatusUpdated", handleSOSStatusUpdated);
    socket.on("chatMessage", handleChatMessage);

    return () => {
      socket.off("newSOS", handleNewSOS);
      socket.off("sosStatusUpdated", handleSOSStatusUpdated);
      socket.off("chatMessage", handleChatMessage);
    };
  }, [token, volunteerId, selectedSos, fetchSosRequests]);


const handleAccept = async (id) => {
  try {
    const res = await axios.put(
      `${BACKEND_URL}/api/sos/${id}/accept`,
      { volunteerId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setSosRequests(prev =>
      sortByLatest([res.data, ...prev.filter(s => s._id !== res.data._id)])
    );
    setSelectedSos(res.data);
    toast.success(`Accepted SOS from ${res.data.name || "a user"}!`);
    socket.emit("joinSOSChat", id);
  } catch {
    toast.error("Failed to accept SOS.");
  }
};

const updateStatus = async (sosId, newStatus) => {
  try {
    const res = await axios.put(
      `${BACKEND_URL}/api/sos/${sosId}/status`,
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setSosRequests(prev =>
      prev.map(sos => sos._id === res.data._id ? res.data : sos)
    );
    setSelectedSos(res.data);
    toast.success(`SOS status updated to ${newStatus}`);
  } catch {
    toast.error("Failed to update status.");
  }
};


  // Chat
  const handleChat = async (e) => {
    e.preventDefault();
    const message = e.target.elements.chatInput.value.trim();
    if (!message || !selectedSos) return;
    try {
      await axios.post(`${BACKEND_URL}/api/sos/${selectedSos._id}/chat`,
        { sender: volunteerName || 'Volunteer', message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      e.target.elements.chatInput.value = "";
    } catch {
      toast.error("Failed to send message.");
    }
  };

  const handleViewSOS = (sosId) => {
    const sos = sosRequests.find(s => s._id === sosId);
    if (sos) setSelectedSos({ ...sos });
  };

  const filteredSosList = sosRequests.filter(sos => {
    const assignedToMe = sos.assignedVolunteer?._id === volunteerId || sos.assignedVolunteer?.id === volunteerId;
    switch (statusFilter) {
      case "All": return true;
      case "Pending": return sos.status === "Pending" && !sos.assignedVolunteer;
      case "Accepted": return sos.status === "Accepted" && assignedToMe;
      case "In Progress": return sos.status === "In Progress" && assignedToMe;
      case "Completed": return sos.status === "Completed" && assignedToMe;
      default: return false;
    }
  });

  return (
    <div className="volunteer-dashboard">
      <ToastContainer />
      <header className="header">
        <div className="header-content">
          <h1>Volunteer Dashboard</h1>
          {volunteerName && <p className="welcome-message">Welcome, {volunteerName}! 👋</p>}
          <p className="app-description">
            This dashboard provides real-time SOS requests, a map for locations, and a chat to communicate with users. Your efforts save lives! 💖
          </p>
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="logout-button">Logout</button>
      </header>

      <main className="main-content">
        <div className="table-map-container">
          {/* Left Table */}
          <div className="table-container-left">
            <h2>SOS Requests ✨</h2>
            <div className="filter-container">
              <label htmlFor="statusFilter">Filter by Status:</label>
              <select id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Requests</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted (Assigned to Me)</option>
                <option value="In Progress">In Progress (Assigned to Me)</option>
                <option value="Completed">Completed (Assigned to Me)</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Name</th>
                    <th>View on Map</th>
                    <th>Message</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Volunteer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSosList.length > 0 ? filteredSosList.map(sos => (
                    <tr
                      key={sos._id}
                      className={`${selectedSos?._id === sos._id ? "selected-row" : ""} ${newSosId === sos._id ? "blink-row" : ""}`}
                    >
                     <td>
  {sos.createdAt
    ? new Date(sos.createdAt).toLocaleString()
    : "—"}
</td>

                      <td>{sos.name}</td>
                      <td><button className="view-btn" onClick={() => handleViewSOS(sos._id)}>View</button></td>
                      <td>{sos.message}</td>
                      <td>{sos.userProvidedAddress}</td>
                      <td>{sos.status}</td>
                      <td>{sos.assignedVolunteer?.name || "None"}</td>
                      <td>
                        {sos.status === "Pending" ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); handleAccept(sos._id); }}>Accept</button>
                            {/* <button onClick={e => { e.stopPropagation(); updateStatus(sos._id, "Canceled"); }}
                              style={{ marginLeft: "5px", backgroundColor: "red", color: "white" }}>Cancel</button> */}
                          </>
                        ) : (
                          <select value={sos.status} onChange={e => { e.stopPropagation(); updateStatus(sos._id, e.target.value); }}>
                            <option value="Accepted">Accepted</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Canceled">Canceled</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  )) : <tr><td colSpan="8" style={{ textAlign: "center" }}>No SOS requests.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        {/* right side including map and chat */}
          <div className={`map-chat-container-right ${chatMaximized ? "chat-maximized" : ""}`}>
            {!chatMaximized && (
              <div className="map-section">
                {userLocation ? (
                  <SOSMap sosList={sosRequests.map(s => ({ ...s, createdAt: new Date(s.createdAt) }))} volunteerPos={userLocation} focusSosId={selectedSos?._id} />
                ) : <div>Loading map...</div>}
              </div>
            )}

            {selectedSos && (
              <div className="chat-container">
                <div className="chat-header">
                  <h3>Chat with {selectedSos.name}</h3>
                  <button className="maximize-btn" onClick={() => setChatMaximized(!chatMaximized)}>
                    {chatMaximized ? " ⛶" : " ⛶"}
                  </button>
                </div>
                <div className="chat-box">
                  {selectedSos.chat?.map((c, i) => (
                    <div key={i} className={`chat-message ${c.sender === volunteerName ? "volunteer-message" : "user-message"}`}>
                      <div className="bubble">{c.message}</div>
                      <div className="timestamp">{new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  ))}
                </div>
                <form className="chat-form" onSubmit={handleChat}>
                  <input type="text" name="chatInput" placeholder="Type a message..." />
                  <button type="submit">Send</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="back-to-top"
          style={{
            position: "fixed",
            bottom: "40px",
            right: "40px",
            padding: "10px 15px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            zIndex: 1000
          }}
        >
          ↑ Back to Top
        </button>
      )}
    </div>
  );
};

export default VolunteerDashboard;
