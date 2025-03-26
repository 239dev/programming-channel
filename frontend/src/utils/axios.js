import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000, // 10 seconds timeout
  withCredentials: true
});

// Add a request interceptor
instance.interceptors.request.use(
  (config) => {
    console.log('Axios Request Interceptor:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data ? Object.keys(config.data) : 'NO DATA'
    });

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Improved FormData handling
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    console.error('Axios Request Interceptor Error:', {
      name: error.name,
      message: error.message,
      config: error.config
    });
    return Promise.reject(error);
  }
);

// Add a response interceptor
instance.interceptors.response.use(
  (response) => {
    console.log('Axios Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error('Axios Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default instance;