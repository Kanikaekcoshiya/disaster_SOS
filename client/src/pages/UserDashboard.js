import React, { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/UserDashboard.css'; 

// const BACKEND_URL = "http://localhost:8080";

const BACKEND_URL = process.env.REACT_APP_API_URL;


const socket = io(BACKEND_URL);

const UserDashboard = () => {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        message: "",
        userProvidedAddress: "",
        latitude: null,
        longitude: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sosRequest, setSosRequest] = useState(null);
    const [chatLog, setChatLog] = useState([]);
    const [chatInput, setChatInput] = useState(""); 

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const getLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }

        toast.info("Finding your location... 🛰️");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData((prev) => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }));
                toast.dismiss(); 
                toast.success("📍 Location obtained successfully! You can now send your SOS.");
            },
            (error) => {
                toast.dismiss();
                toast.error(`Error getting location: ${error.message}`);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleSendSOS = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (formData.latitude === null || formData.longitude === null) {
            toast.error("Please get your location before sending an SOS. ⚠️");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                name: formData.name?.trim() || "Anonymous",
                phone: formData.phone?.trim() || "Not provided",
                message: formData.message?.trim() || "No message provided",
                userProvidedAddress: formData.userProvidedAddress?.trim() || "Not provided",
                latitude: Number(formData.latitude),
                longitude: Number(formData.longitude)
            };

            console.log("Sending SOS payload:", payload);
            const res = await axios.post(`${BACKEND_URL}/api/sos`, payload);
            setSosRequest(res.data);
            setChatLog(res.data.chat || []);
            socket.emit("joinSOSChat", res.data._id);
            toast.success("✅ SOS sent successfully! Help is on the way. Stay safe!");
        } catch (err) {
            console.error("SOS submission failed:", err.response?.data || err.message);
            toast.error(`Failed to send SOS: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

   
const handleCancelSOS = async () => {
    if (!sosRequest) return;

    if (!window.confirm("Are you sure you want to cancel this SOS request?")) {
        return;
    }

    try {
        await axios.patch(`${BACKEND_URL}/api/sos/cancel/${sosRequest._id}`);

        // User cancelled manually 
        setSosRequest(null);
        setChatLog([]);
        setFormData({
            name: "",
            phone: "",
            message: "",
            userProvidedAddress: "",
            latitude: null,
            longitude: null,
        });

        toast.info("🚫 SOS request cancelled. You can now send a new SOS.");
    } catch (err) {
        console.error("Failed to cancel SOS:", err.response?.data || err.message);
        toast.error(`Failed to cancel SOS: ${err.response?.data?.message || err.message}`);
    }
};


    const handleUserChat = (e) => {
        e.preventDefault();
        if (chatInput.trim() === "" || !sosRequest) return;

        const chatMessage = {
            sosId: sosRequest._id,
            sender: formData.name || 'User',
            message: chatInput,
        };
        
        socket.emit("chatMessage", chatMessage);
        setChatInput("");
    };
  


useEffect(() => {
    const handleStatusUpdate = (updatedSos) => {
        if (sosRequest && updatedSos._id === sosRequest._id) {
            // Admin cancelled → reset form
            if (updatedSos.status === "Cancelled") {
              
                if (sosRequest.status !== "Cancelled") {
                    toast.info("❌ Your SOS request was cancelled by admin. You can now send a new SOS.");
                    setSosRequest(null);
                    setChatLog([]);
                    setFormData({
                        name: "",
                        phone: "",
                        message: "",
                        userProvidedAddress: "",
                        latitude: null,
                        longitude: null,
                    });
                }
                return;
            }

            // Other status updates
            setSosRequest(updatedSos);
            toast.info(`🔔 Your SOS status has been updated to: ${updatedSos.status}`);
        }
    };

    const handleChatMessage = (data) => {
        if (sosRequest && data.sosId === sosRequest._id) {
            const senderName = (data.sender === (formData.name || 'User')) ? 'You' : data.sender;
            setChatLog((prev) => [...prev, { sender: senderName, text: data.message }]);
        }
    };

    socket.on("sosStatusUpdated", handleStatusUpdate);
    socket.on("chatMessage", handleChatMessage);

    return () => {
        socket.off("sosStatusUpdated", handleStatusUpdate);
        socket.off("chatMessage", handleChatMessage);
    };
}, [sosRequest, formData.name]);

    return (
        <div className="user-dashboard">
            <ToastContainer />
            <header className="header">
                <h2>ResQLink 🆘</h2>
              
                <p className="app-main-tagline">
                 "Facing an emergency? ResQLink helps you reach aid fast. Share your location, send an SOS, and we'll connect you. 🚀"
                </p>
            </header>
            {!sosRequest ? (
                <form onSubmit={handleSendSOS}>
                    <h2>Request for Help 📞</h2>
                    <div className="form-group">
                        <label htmlFor="name">Name (Optional)</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Your Name" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Phone (Optional)</label>
                        <input type="text" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Your Phone Number" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="message">Message (Optional)</label>
                        <textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Please provide details of your situation (e.g., 'Trapped under debris', 'Need medical help')" rows="3"></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="userProvidedAddress">Approximate Address (Optional)</label>
                        <input type="text" id="userProvidedAddress" name="userProvidedAddress" value={formData.userProvidedAddress} onChange={handleChange} placeholder="E.g., 123 Main St, Anytown" />
                    </div>
                    <button type="button" onClick={getLocation} className="get-location-btn">
                        📍 Get My Location (Required)
                    </button>
                  
                    <button type="submit" className="submit-sos-btn" disabled={!formData.latitude || !formData.longitude || isSubmitting}>
                        {isSubmitting ? 'Sending... ⏳' : '🔥 Send SOS (Required)'}
                    </button>
                </form>
            ) : (
                <div className="sos-status-container">
                    <h2>SOS Request Sent 🎉</h2>
                    <p>Your request has been submitted. Status: <strong className={`status-${sosRequest.status.toLowerCase().replace(/\s/g, '-')}`}>{sosRequest.status}</strong></p>
                    {/* {sosRequest.assignedVolunteer && (
                        <p>A volunteer, <strong>{sosRequest.assignedVolunteer.name}</strong>, is on the way. Thank you for your patience! 🦸</p>
                    )} */}

                    { sosRequest.assignedVolunteer && (
  <p className="status-message">
    {sosRequest.status === "Accepted" && (
      <>🚀 A volunteer, <strong>{sosRequest.assignedVolunteer.name}</strong>, has accepted your request and is on the way!</>
    )}
    {sosRequest.status === "In Progress" && (
      <>⚡ Your assigned volunteer, <strong>{sosRequest.assignedVolunteer.name}</strong>, is currently helping you.</>
    )}
    {sosRequest.status === "Completed" && (
      <>✅ Your request has been completed by <strong>{sosRequest.assignedVolunteer.name}</strong>. Stay safe!</>
    )}
    {sosRequest.status === "Cancelled" && (
      <>❌ This SOS request was cancelled.</>
    )}
    {sosRequest.status === "Pending" && (
      <>⏳ Waiting for a volunteer to accept your request...</>
    )}
  </p>
)}

                    <button onClick={handleCancelSOS} className="cancel-sos-btn">❌ Cancel SOS</button>

                    <div className="chat-container">
                        <h3>Chat with Volunteer 💬</h3>
                        <div className="chat-log">
                            {chatLog.map((msg, index) => (
                                <div key={index} className={`chat-message ${msg.sender === 'You' ? 'user' : 'volunteer'}`}>
                                    {msg.text}
                                </div>
                            ))}
                        </div>
 

                        <form onSubmit={handleUserChat} className="chat-input-form">
                            <input 
                                type="text" 
                                value={chatInput} 
                                onChange={(e) => setChatInput(e.target.value)} 
                                placeholder="Type a message to your assigned volunteer..." 
                            />
                            <button type="submit">Send ➡️</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
