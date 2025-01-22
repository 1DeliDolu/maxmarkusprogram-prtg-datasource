import { DataQuery } from '@grafana/schema';
import {
  MetricFindValue as GrafanaMetricFindValue,
  DataSourceJsonData,
  AnnotationEvent,

  AnnotationQuery
} from '@grafana/data';

export interface PRTGQuery extends DataQuery {
  refId: string;
  queryType: 'metrics' | 'raw' | 'text';
  queryText?: string;
  rawQuery?: string;
  groupSelection: { name: string };
  deviceSelection: { name: string };
  sensorSelection: { name: string };
  channelSelection: { name: string };
  valueSelection?: { name: string };
  sensorId?: number;
  propertySelection: { name: string } | null; // Change from optional to nullable
  filterPropertySelection?: { name: string; }
  columnDefinitions?: string;
  sortCriteria?: string;
  metricValue?: string | number;
  propertyKey?: string | number;
  textQuery?: {
    valueFrom: 'group' | 'device' | 'sensor';
    property: string;
    filter: string;
  }
  raw?: {
    uri: string;
    queryString: string;
  };
  rawRequest: {
    endpoint: string;
    parameters: string;
  };
  transformations: any[];
  options: PRTGQueryOptions;
  validationErrors?: string[];
  property?: string | number; 
  metric?: string;
  queryOptions: {
    displayMode: PRTGEditorMode;
    includeSensorName: boolean;
    includeDeviceName: boolean;
    includeGroupName: boolean;
    filterPropertyName?: {
      name: string;
      visible_name: string;
    };
    propertyName?: {
      name: string;
      visible_name: string;
    };
    textProperty?: {
      name: string;
      visible_name: string;
    };
    textFilter?: string;
    invertChannelFilter?: boolean;
    target: string;
  };

}

export const DEFAULT_QUERY: Partial<PRTGQuery> = {
  queryType: 'metrics',
  queryText: 'content=sensors&columns=objid,sensor,lastvalue,status,message',
  columnDefinitions: 'objid,sensor,lastvalue,status,message',
  sortCriteria: 'lastvalue',
  propertySelection: null, // Add default value
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface ValueData {
  DateTime: string;
  Value: string | number;
  Value_raw?: string | number;
}

export interface PRTGSensorData {
  objid: number;
  sensor: string;
  device: string;      // Diese Zeile hinzufügen
  lastvalue: string;
  lastvalue_raw: number;
  status: string;
  message: string;
  datetime: string;
  value: number;
  priority: number;
  favorite: number;
}

export interface PRTGAnnotationQuery extends AnnotationQuery<PRTGQuery> {
  annotation: {
    sensorId?: string;
    name: string;
    enable: boolean;
    iconColor?: string;
  };
}



// Remove old AnnotationQuery interface and use AnnotationEvent from @grafana/data
export interface PRTGAnnotationEvent extends AnnotationEvent {
  annotation: {
    sensorId?: string;
    [key: string]: any;
  };
}

export interface PRTGMessage {
  datetime: string;
  datetime_raw?: number;
  message: string;
  status: string;
  time?: number;
  title?: string;
  text?: string;
  tags?: string[];
  type?: string;
  parent?: string;
}

export interface PRTGAnnotationMessage {
  time: number;
  title: string;
  text: string;
  tags: string[];
}

export interface AnnotationMessage {
  time: number;
  title: string;
  text: string;
  tags?: string[];
  annotation?: any;
}

export interface AnnotationResponse {
  time: number;
  title: string;
  text: string;
  tags?: string[];
  annotation?: any;
}

export interface DataSourceResponse {
  datapoints?: DataPoint[];
  groups?: any[];
  devices?: any[];
  sensors?: PRTGSensorData[];
  channels?: any[];
  values?: string[];
  statusText?: string | number | undefined;
  status?: number | undefined;
  histdata?: ValueData[];
  sensordata?: any;
  messages?: PRTGMessage[];
  Version?: string;
}

export interface MetricFindValue extends GrafanaMetricFindValue {
  text: string;
  value?: string;
  expandable?: boolean; // Änderung von number zu boolean
}

export interface TemplateFilter {
  type: 'group' | 'device' | 'sensor' | 'channel';
  filter: string;
  filterExpression?: string;
}

/**
 * These are options configured for each DataSource instance
 */
export interface PRTGDataSourceConfig extends DataSourceJsonData {
  apiUrl?: string;
  username?: string;
  hostname?: string;
  passhash?: string;
  cacheTimeout?: number;  // Cache-Timeout in Sekunden
  tzAutoAdjust?: boolean;
  metricsLimit?: number;
  oauth2?: {
    enabled: boolean;
    tokenUrl?: string;
  };
  timeout?: number;  // Timeout in Millisekunden
}

export interface MySecureJsonData {
  apiKey?: string;
  passhash?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Secure json data is encrypted and never sent to the browser
 */
export interface PRTGSecureJsonData {
  passhash?: string;
  apiKey?: string;
  // Add any other sensitive fields here
}

export interface PRTGEditorMode {
  name: string;
  value: string;
  filterProperty: Record<string, any>;
  valueSource: Record<string, any>;
  valueProperty: Record<string, any>;
}
// eslint-disable-next-line
export interface IEditorModes {
  [key: number]: PRTGEditorMode;
}


// eslint-disable-next-line 
export interface IScopeDefaults {
  metric: {
    propertyList: Array<{
      name: string;
      visible_name: string;
    }>;
    filterPropertyList: Array<{
      name: string;
      visible_name: string;
    }>;
  };
}

export interface PRTGQueryOptions {
  mode: PRTGEditorMode;
  includeGroupName: boolean;
  includeSensorName: boolean;
  includeDeviceName: boolean;
  filterPropertyName: {
    name: string;
    visible_name: string;
  };
  propertyName: {
    name: string;
    visible_name: string;
  };
  target: string;
  deviceName?: {
    name: string;
    visible_name: string;
  };
  sensorName?: {
    name: string;
    visible_name: string;
  };
  groupName?: {
    name: string;
    visible_name: string;
  };
  // Optional properties
  textProperty?: {
    name: string;
    visible_name: string;
  };
  multiplier?: string;
  invertChannelFilter?: boolean;
}

export interface PRTGApiConfig {
  baseUrl: string;
  username: string;
  passwordHash: string;
  cacheTimeout: number;  
  enableTimeZoneAdjust: boolean;
  useProxy?: boolean;
  timeout?: number; 
}

export interface PRTGSeries {
  Time: number;
  Value: number;
  [key: string]: any;
}

export interface PrtgValues {
  datetime: string;
  [key: string]: string | number; 
}

export interface PRTGHistoricalResponse {
  'prtg-version': string;
  treesize: number;
  histdata: PrtgValues[];
}

export interface PRTGHistoricalData {
  histdata: PrtgValues[];
}





