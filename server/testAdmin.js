// const axios = require('axios');

// const API_BASE = 'http://localhost:8080/api/admin';

// // hardcoded admin login credentials 
// const adminCreds = {
//   email: "admin@example.com",
//   password: "admin123"
// };

// async function runTests() {
//   console.log("🔍 Testing Admin API endpoints...");

//   try {
//     // 1. Login to get token
//     const loginRes = await axios.post(`${API_BASE}/login`, adminCreds);
//     const token = loginRes.data.token;
//     console.log("✅ Logged in as Admin. Token received.");

//     // 2. Set headers
//     const headers = { Authorization: `Bearer ${token}` };

//     // 3. Test endpoints
//     const health = await axios.get(`${API_BASE}/health`, { headers });
//     console.log("✅ /health:", health.data);

//     const analytics = await axios.get(`${API_BASE}/analytics`, { headers });
//     console.log("✅ /analytics:", analytics.data);

//     const sos = await axios.get(`${API_BASE}/sos`, { headers });
//     console.log("✅ /sos:", sos.data);

//     const volunteers = await axios.get(`${API_BASE}/volunteers`, { headers });
//     console.log("/volunteers:", volunteers.data);

//   } catch (err) {
//     console.error("❌ Error:", err.response?.data || err.message);
//   }

//   console.log("\n✅ Done testing!");
// }

// runTests();
