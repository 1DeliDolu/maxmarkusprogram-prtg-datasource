import CryptoJS from 'crypto-js';

const SECRET_KEY = 'PRTG_GRAFANA_SECRET'; 

export const encryptPassword = (password: string): string => {
    console.log('Encrypting password: ', CryptoJS.AES.encrypt(password, SECRET_KEY).toString());
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};
