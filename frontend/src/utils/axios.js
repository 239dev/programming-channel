import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000, // 10 seconds timeout
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
    console.log('Axios Full Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      config: {
        method: response.config?.method,
        url: response.config?.url,
        headers: response.config?.headers
      }
    });
    return response;
  },
  (error) => {
    console.error('Comprehensive Axios Error:', {
      type: 'Network/Request Error',
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      message: error.message,
      name: error.name,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        data: error.config?.data ? Object.keys(error.config.data) : 'NO DATA'
      },
      fullErrorObject: error
    });

    // More detailed error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      console.warn('Server Responded with Error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.warn('No Response Received:', {
        request: error.request,
        message: error.message
      });
    } else {
      // Something happened in setting up the request
      console.warn('Error Setting Up Request:', {
        message: error.message
      });
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;