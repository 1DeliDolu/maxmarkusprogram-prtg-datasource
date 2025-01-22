import { DataSourceInstanceSettings } from '@grafana/data';
import { PRTGDataSourceConfig } from '../types';

// Add custom interface instead of using DataSourceJsonDataWithSecureJsonFields
interface SecureJsonFields {
    passhash?: boolean;
    apiKey?: boolean;
}

interface SecureJsonData {
    passhash?: string;
    apiKey?: string;
}

// Extend DataSourceInstanceSettings interface
export interface PRTGDataSourceSettings extends DataSourceInstanceSettings<PRTGDataSourceConfig> {
    jsonData: PRTGDataSourceConfig;
    secureJsonFields?: SecureJsonFields;
    secureJsonData?: SecureJsonData;
}

// Add this interface
export interface TestDataSourceResponse {
    status: 'success' | 'error';
    message: string;
    details?: {
        message?: string;
        verboseMessage?: string;
    };
}
