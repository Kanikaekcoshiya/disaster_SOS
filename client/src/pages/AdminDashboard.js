import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import '../styles/AdminDashboard.css';

// const BACKEND_URL = "http://localhost:8080";
const BACKEND_URL = process.env.REACT_APP_API_URL;


const COLORS = {
  pending: '#f39c12',
  accepted: '#27ae60',
  inProgress: '#3498db',
  completed: '#8e44ad',
  cancelled: '#95a5a6',
  approved: '#2ecc71',
  suspended: '#7f8c8d',
};

const AdminDashboard = () => {
  const [sosList, setSosList] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [sosFilterStatus, setSosFilterStatus] = useState('All');
  const [volunteerFilterStatus, setVolunteerFilterStatus] = useState('All');
  const [selectedSosForMap, setSelectedSosForMap] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const sosTableRef = useRef(null);
  const volunteersTableRef = useRef(null);

  const token = localStorage.getItem('adminToken');

  // Show Back to Top button 
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToSection = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    if (!token) {
      alert('No admin token found! Please log in.');
      setLoading(false);
      return;
    }

    try {
      const [sosRes, volRes, analyticsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/sos`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BACKEND_URL}/api/admin/volunteers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BACKEND_URL}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setSosList(sosRes.data);
      setVolunteers(volRes.data);

      const updatedAnalytics = { ...analyticsRes.data };
      updatedAnalytics.inProgressSOS = sosRes.data.filter(
        sos => sos.status === 'Accepted' && sos.assignedVolunteer
      ).length;
      updatedAnalytics.cancelledSOS = sosRes.data.filter(sos => sos.status === 'Cancelled').length;
      updatedAnalytics.suspendedVolunteers = volRes.data.filter(v => v.status === 'Suspended').length;

      setAnalytics(updatedAnalytics);
    } catch (err) {
      console.error('Error fetching data:', err.response?.data || err.message);
      alert(`Failed to load dashboard: ${err.response?.data?.message || err.message}`);
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin-login';
  };

  // CANCEL SOS 
  const handleCancelSos = async (sosId) => {
    if (!window.confirm('Are you sure you want to cancel this SOS request?')) return;

    try {
      const res = await axios.patch(
        `${BACKEND_URL}/api/admin/sos/admin/cancel/${sosId}`
,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Cancel Response:', res.data);

      setSosList(prev => prev.map(sos => sos._id === sosId ? { ...sos, status: 'Cancelled' } : sos));

      alert('SOS request cancelled successfully!');
    } catch (err) {
      console.error('Error cancelling SOS:', err.response?.data || err.message);
      alert(`Failed to cancel SOS: ${err.response?.data?.message || err.message}`);
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    }
  };

  const handleAssignVolunteer = async (sosId, volunteerId) => {
    if (!volunteerId) return alert('Please select a volunteer.');

    try {
      await axios.put(
        `${BACKEND_URL}/api/sos/${sosId}/assign`,
        { volunteerId, status: 'Accepted' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const assignedVol = volunteers.find(v => v._id === volunteerId) || null;
      setSosList(prev => prev.map(sos => sos._id === sosId ? { ...sos, assignedVolunteer: assignedVol, status: 'Accepted' } : sos));

      alert('Volunteer assigned successfully!');
    } catch (err) {
      console.error('Error assigning volunteer:', err.response?.data || err.message);
      alert(`Failed to assign volunteer: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleUpdateVolunteerStatus = async (volunteerId, newStatus) => {
    if (!window.confirm(`Change volunteer status to ${newStatus}?`)) return;

    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/volunteers/${volunteerId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVolunteers(prev => prev.map(v => v._id === volunteerId ? { ...v, status: newStatus } : v));
      alert(`Volunteer status updated to ${newStatus}!`);
    } catch (err) {
      console.error('Error updating volunteer status:', err.response?.data || err.message);
      alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSosFilterChange = (e) => setSosFilterStatus(e.target.value);
  const handleVolunteerFilterChange = (e) => setVolunteerFilterStatus(e.target.value);

  const filteredSosList = sosList.filter(sos => {
    if (sosFilterStatus === 'All') return true;
    if (sosFilterStatus === 'In Progress') return sos.status === 'Accepted' && sos.assignedVolunteer;
    return sos.status === sosFilterStatus;
  });

  const filteredVolunteers = volunteers.filter(v => volunteerFilterStatus === 'All' ? true : v.status === volunteerFilterStatus);

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Loading...</p></div>;

  // Charts 
  const sosChartData = [
    { name: 'Pending', value: analytics.pendingSOS || 0, color: COLORS.pending },
    { name: 'Accepted', value: analytics.acceptedSOS || 0, color: COLORS.accepted },
    { name: 'In Progress', value: analytics.inProgressSOS || 0, color: COLORS.inProgress },
    { name: 'Completed', value: analytics.completedSOS || 0, color: COLORS.completed },
    { name: 'Cancelled', value: analytics.cancelledSOS || 0, color: COLORS.cancelled },
  ].filter(e => e.value > 0);

  const volunteerChartData = [
    { name: 'Approved', value: analytics.approvedVolunteers || 0, color: COLORS.approved },
    { name: 'Pending', value: analytics.pendingVolunteers || 0, color: COLORS.pending },
    { name: 'Suspended', value: analytics.suspendedVolunteers || 0, color: COLORS.suspended },
  ].filter(e => e.value > 0);

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'accepted': return 'status-accepted';
      case 'in progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'approved': return 'status-approved';
      case 'suspended': return 'status-suspended';
      default: return '';
    }
  };

  const renderLegendText = (name, entry) => <span style={{ color: entry.color }}>{name} ({entry.payload.value})</span>;

  return (
    <div className="admin-dashboard">
      <h2>ResQLink Admin Dashboard 🚀</h2>

      <nav className="dashboard-navigation">
        <button onClick={() => scrollToSection(sosTableRef)}>🚨 All SOS Requests</button>
        <button onClick={() => scrollToSection(volunteersTableRef)}>👥 Volunteers List</button>
        <button onClick={handleLogout}>🚪 Logout</button>
      </nav>

      <div className="cards">
        <div className="card sos-stats-card">
          <h4>SOS Requests 🚨 (Total: {analytics.totalSOS || 0})</h4>
          {sosChartData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sosChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" nameKey="name">
                  {sosChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend layout="vertical" align="right" verticalAlign="middle" formatter={renderLegendText} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p>No SOS data</p>}
        </div>

        <div className="card volunteer-stats-card">
          <h4>Volunteers 👥 (Total: {analytics.totalVolunteers || 0})</h4>
          {volunteerChartData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={volunteerChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" nameKey="name">
                  {volunteerChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend layout="vertical" align="right" verticalAlign="middle" formatter={renderLegendText} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p>No volunteer data</p>}
        </div>
      </div>

      {/* SOS Table */}
      <h3 ref={sosTableRef}>All SOS Requests 📜</h3>
      <div className="filter-container">
        <label>Filter by Status:</label>
        <select value={sosFilterStatus} onChange={handleSosFilterChange}>
          <option>All</option>
          <option>Pending</option>
          <option>Accepted</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Message</th>
              <th>Status</th>
              <th>Assigned Volunteer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSosList.length ? filteredSosList.map(sos => (
              <tr key={sos._id}>
                <td>{sos.name}</td>
                <td>{sos.message}</td>
                <td className={getStatusClass(sos.status)}>{sos.status}</td>
                <td>{sos.assignedVolunteer?.name || 'None'}</td>
                <td>
                  {(sos.status !== 'Completed' && sos.status !== 'Cancelled') && (
                    <button onClick={() => handleCancelSos(sos._id)}>❌ Cancel</button>
                  )}
                  {sos.status === 'Pending' && (
                    <select onChange={e => handleAssignVolunteer(sos._id, e.target.value)} value={sos.assignedVolunteer?._id || ''}>
                      <option value="">Assign Volunteer</option>
                      {volunteers.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                    </select>
                  )}
                  {sos.latitude && sos.longitude && (
                    <button onClick={() => setSelectedSosForMap(sos)}>🗺️ View on Map</button>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan="5">No SOS requests</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Volunteers Table */}
      <h3 ref={volunteersTableRef}>Volunteers 👷‍♀️👷‍♂️</h3>
      <div className="filter-container">
        <label>Filter by Status:</label>
        <select value={volunteerFilterStatus} onChange={handleVolunteerFilterChange}>
          <option>All</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Suspended</option>
        </select>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVolunteers.length ? filteredVolunteers.map(v => (
              <tr key={v._id}>
                <td>{v.name}</td>
                <td>{v.email}</td>
                <td className={getStatusClass(v.status)}>{v.status}</td>
                <td>
                  <select value={v.status} onChange={e => handleUpdateVolunteerStatus(v._id, e.target.value)}>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Suspended</option>
                  </select>
                </td>
              </tr>
            )) : <tr><td colSpan="4">No volunteers</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Map Modal */}
      {selectedSosForMap && (
        <div className="map-modal-overlay">
          <div className="map-modal-content">
            <button onClick={() => setSelectedSosForMap(null)}>X</button>
            <h3>Location for SOS: {selectedSosForMap.name}</h3>
            <iframe
              title="SOS Map"
              width="100%"
              height="450"
              style={{ border: 0, borderRadius: '8px' }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${selectedSosForMap.latitude || 0},${selectedSosForMap.longitude || 0}&z=15&output=embed`}
            />
          </div>
        </div>
      )}

      {/* Back to Top */}
      {showBackToTop && (
        <button className="back-to-top" onClick={scrollToTop}>⬆ Back to Top</button>
      )}
    </div>
  );
};

export default AdminDashboard;
