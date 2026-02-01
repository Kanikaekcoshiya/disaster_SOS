import axios from 'axios';

const API_URL = 'http://localhost:8080/api/sos';

export const sendSOS = async (sosData) => {
  try {
    const response = await axios.post(API_URL, sosData);
    return response.data;
  } catch (error) {
    console.error('Axios Error:', error);
    throw error;
  }
};what