import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const MASKED_VALUE = '****';

export const maskPasshash = (url: string): string => {
  return url.replace(/([&?]passhash=)[^&]+/g, `$1${MASKED_VALUE}`);
};

export const maskSensitiveData = (obj: any): any => {
  if (!obj) return obj;
  
  const sensitiveKeys = ['passhash', 'passwordHash', 'password'];
  
  if (typeof obj === 'string') {
    return maskPasshash(obj);
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        acc[key] = MASKED_VALUE;
      } else if (typeof obj[key] === 'object') {
        acc[key] = maskSensitiveData(obj[key]);
      } else if (typeof obj[key] === 'string') {
        acc[key] = maskPasshash(obj[key]);
      } else {
        acc[key] = obj[key];
      }
      return acc;
    }, Array.isArray(obj) ? [] : {});
  }
  
  return obj;
};

export const createAxiosInterceptors = () => {
  return {
    requestInterceptor: (config: InternalAxiosRequestConfig) => {
      // Create copy for logging
      const maskedConfig = { ...config };
      
      if (maskedConfig.data) {
        // Mask sensitive fields in request body
        const maskedData = { ...maskedConfig.data };
        if (maskedData.passhash) maskedData.passhash = MASKED_VALUE;
        if (maskedData.username) maskedData.username = MASKED_VALUE;
        maskedConfig.data = maskedData;
      }

      // Mask Authorization header
      if (maskedConfig.headers?.Authorization) {
        maskedConfig.headers.Authorization = `Bearer ${MASKED_VALUE}`;
      }

      console.debug('Request:', maskedConfig);
      return config;
    },

    responseInterceptor: (response: AxiosResponse) => {
      // Mask any sensitive data in response
      const maskedResponse = { ...response };
      if (maskedResponse.config) {
        maskedResponse.config = maskSensitiveData(maskedResponse.config);
      }
      console.debug('Response:', maskedResponse);
      return response;
    },

    errorInterceptor: (error: any) => {
      // Mask sensitive data in error objects
      if (error.config) {
        const maskedError = { ...error };
        maskedError.config = maskSensitiveData(error.config);
        console.error('Error:', maskedError);
      }
      return Promise.reject(error);
    }
  };
};