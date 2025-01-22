export interface PRTGApiConfig {
  baseUrl: string;
  username: string;
  passwordHash: string;
  cacheTimeout?: number;
  enableTimeZoneAdjust?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  apiKey?: string;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  timeout: number;
}


export interface PRTGDataSourceConfig {
  hostname: string;
  username: string;
  passhash: string;
  cacheTimeout: number;
  tzAutoAdjust: boolean;
  timeout: number;
}

export interface CCacheService {
  has(key: string): boolean;
  get<T>(key: string): T | null;
  set<T>(key: string, data: T): void;
  clear(): void;
}

export interface PRTGQueryItem {
  sensorId: number;
  channelId?: string;
  name?: string;
}

export interface PRTGHistDataResponse {
  histdata: {
    [sensorId: string]: {
      item: PRTGHistDataItem[];
    };
  };
}


export interface PRTGHistoryResult {
  sensor: number;
  channel: string;
  datetime: Date;
  value: number;
  status?: string;

}

export interface PRTGItem {
  objid: number;
  group?: string;
  device?: string;
  sensor?: string;
  channel?: string;
  channel_raw?: number;
  name?: string;
  active?: boolean;
  active_raw?: number;
  status?: string;
  status_raw?: number;
  message?: string;
  message_raw?: string;
  priority?: number;
  tags?: string;
}


export interface PRTGHistDataItem {
  datetime_raw: number;
  value_raw: Array<{
    text: string;
    channel: string;
  }> | { text: string };
  status_raw?: number;
}

export interface PRTGDevice {
  group: string;
  device: string;
  sensor: string;
  channel: string;
  active: boolean;
  tags: string;
  status: string;
  status_raw: number;
  message: string;
  priority: string;
  datetime: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PRTGResponse {
  'prtg-version': string;
  treesize: number;
  groups: PRTGGroup[];
  devices: PRTGDevice[];
  sensors: PRTGSensor[];
  channels: PRTGChannel[];
  values: PrtgValues[];
  histresponse: PRTGHistDataResponse[];
  histdata: Array<{
    [key: string]: string | number;
  }>;
  jsClock: number;
  Version: string;
}

export interface PrtgValues {
  datetime: string | number;
  value: string | number;
}

export interface PRTGMessage {
  datetime_raw: number;
  status: string;
  tags?: string;
  message?: string;
  parent: string;
  type: string;

}

export interface PRTGGroup {
  objid: number;
  group: string;
  device: string;
  sensor: string;
  channel: string;
  active: boolean;
  tags: string;
  status: string;
  status_raw: number;
  message: string;
  priority: string;
  datetime: string;
  [key: string]: string | number | boolean | undefined;
}


export interface PRTGSensor {
  objid: number;
  group: string;
  device: string;
  sensor: string;
  channel: string;
  active: boolean;
  tags: string;
  status: string;
  status_raw: number;
  message: string;
  priority: string;
  datetime: string;
   [key: string]: string | number | boolean | undefined;
  
}

export interface PRTGChannel {
  objid: number;
  group: string;
  device: string;
  sensor: string;
  channel: string;
  active: boolean;
  tags: string;
  status: string;
  status_raw: number;
  message: string;
  priority: string;
   [key: string]: string | number | boolean | undefined;
}

export interface PRTGHistoricalResponse {
  'prtg-version': string;
  treesize: number;
  histdata: Array<{
    datetime: string;
    [key: string]: string | number; 
  }>;
}

export interface SortableItem {

  [key: string]: string | number | boolean | undefined;

}
