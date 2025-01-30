import { DataQuery } from '@grafana/schema';
import {
  MetricFindValue as GrafanaMetricFindValue,
  DataSourceJsonData,
  AnnotationEvent,

  AnnotationQuery
} from '@grafana/data';




/**
 * Represents a PRTG query interface that extends DataQuery.
 * @interface PRTGQuery
 * @extends DataQuery
 * 
 * @property {string} refId - Reference identifier for the query
 * @property {'metrics' | 'raw' | 'text'} queryType - Type of query to execute
 * @property {string} [queryText] - Optional query text
 * @property {string} [rawQuery] - Optional raw query string
 * @property {{ name: string }} groupSelection - Selected PRTG group
 * @property {{ name: string }} deviceSelection - Selected PRTG device
 * @property {{ name: string }} sensorSelection - Selected PRTG sensor
 * @property {{ name: string }} channelSelection - Selected PRTG channel
 * @property {{ name: string }} [valueSelection] - Optional value selection
 * @property {number} [sensorId] - Optional sensor identifier
 * @property {{ name: string } | null} propertySelection - Property selection or null
 * @property {{ name: string }} [filterPropertySelection] - Optional filter property selection
 * @property {string} [columnDefinitions] - Optional column definitions
 * @property {string} [sortCriteria] - Optional sort criteria
 * @property {string | number} [metricValue] - Optional metric value
 * @property {string | number} [propertyKey] - Optional property key
 * @property {{
 *   valueFrom: 'group' | 'device' | 'sensor',
 *   property: string,
 *   filter: string
 * }} [textQuery] - Optional text query configuration
 * @property {{
 *   uri: string,
 *   queryString: string
 * }} [raw] - Optional raw query configuration
 * @property {{
 *   endpoint: string,
 *   parameters: string
 * }} rawRequest - Raw request configuration
 * @property {any[]} transformations - Array of transformations to apply
 * @property {PRTGQueryOptions} options - PRTG query options
 * @property {string[]} [validationErrors] - Optional array of validation errors
 * @property {string | number} [property] - Optional property value
 * @property {string} [metric] - Optional metric name
 * @property {{
 *   displayMode: PRTGEditorMode,
 *   includeSensorName: boolean,
 *   includeDeviceName: boolean,
 *   includeGroupName: boolean,
 *   filterPropertyName?: { name: string, visible_name: string },
 *   propertyName?: { name: string, visible_name: string },
 *   textProperty?: { name: string, visible_name: string },
 *   textFilter?: string,
 *   invertChannelFilter?: boolean,
 *   target: string
 * }} queryOptions - Query display and filtering options
 */
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
  propertySelection: { name: string } | null;
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

/**
 * Default query configuration for PRTG API requests
 * @constant {Partial<PRTGQuery>}
 * @property {string} queryType - Type of query to execute, defaults to 'metrics'
 * @property {string} queryText - API query parameters for sensors data
 * @property {string} columnDefinitions - Comma-separated list of columns to retrieve
 * @property {string} sortCriteria - Field to sort results by, defaults to 'lastvalue'
 * @property {null} propertySelection - Additional property filters, defaults to null
 */
export const DEFAULT_QUERY: Partial<PRTGQuery> = {
  queryType: 'metrics',
  queryText: 'content=sensors&columns=objid,sensor,lastvalue,status,message',
  columnDefinitions: 'objid,sensor,lastvalue,status,message',
  sortCriteria: 'lastvalue',
  propertySelection: null,
};




/**
 * Represents a data point with a timestamp and a value.
 * @interface DataPoint
 * @property {number} Time - The timestamp of the data point
 * @property {number} Value - The numerical value of the data point
 */
export interface DataPoint {
  Time: number;
  Value: number;
}





/**
 * Interface representing data for a single value measurement in PRTG
 * @interface
 * @property {string} DateTime - The timestamp of the measurement
 * @property {(string|number)} Value - The formatted value of the measurement
 * @property {(string|number)} [Value_raw] - The raw value of the measurement (optional)
 */
export interface ValueData {
  DateTime: string;
  Value: string | number;
  Value_raw?: string | number;
}










/**
 * Represents sensor data from PRTG Network Monitor
 * @interface PRTGSensorData
 * @property {number} objid - The unique identifier of the sensor
 * @property {string} sensor - The name of the sensor
 * @property {string} device - The device the sensor is monitoring
 * @property {string} lastvalue - The formatted last value received from the sensor
 * @property {number} lastvalue_raw - The raw numeric last value received from the sensor
 * @property {string} status - The current status of the sensor
 * @property {string} message - The status message or additional information from the sensor
 * @property {string} datetime - The timestamp of the last sensor reading
 * @property {number} value - The current value of the sensor
 * @property {number} priority - The priority level of the sensor
 * @property {number} favorite - Flag indicating if the sensor is marked as favorite (0 or 1)
 */
export interface PRTGSensorData {
  objid: number;
  sensor: string;
  device: string;
  lastvalue: string;
  lastvalue_raw: number;
  status: string;
  message: string;
  datetime: string;
  value: number;
  priority: number;
  favorite: number;
}





/**
 * Interface representing a PRTG annotation query, extending the base AnnotationQuery with PRTG-specific properties.
 * @interface PRTGAnnotationQuery
 * @extends {AnnotationQuery<PRTGQuery>}
 * @property {Object} annotation - The annotation configuration object
 * @property {string} [annotation.sensorId] - Optional ID of the PRTG sensor
 * @property {string} annotation.name - Name of the annotation
 * @property {boolean} annotation.enable - Flag to enable/disable the annotation
 * @property {string} [annotation.iconColor] - Optional color code for the annotation icon
 */
export interface PRTGAnnotationQuery extends AnnotationQuery<PRTGQuery> {
  annotation: {
    sensorId?: string;
    name: string;
    enable: boolean;
    iconColor?: string;
  };
}




/**
 * Represents an annotation event for PRTG sensors.
 * Extends the base AnnotationEvent interface.
 * @interface
 * @extends {AnnotationEvent}
 * @property {object} annotation - The annotation object containing sensor information
 * @property {string} [annotation.sensorId] - Optional identifier of the PRTG sensor
 * @property {any} [annotation[key]] - Additional annotation properties with any value type
 */
export interface PRTGAnnotationEvent extends AnnotationEvent {
  annotation: {
    sensorId?: string;
    [key: string]: any;
  };
}

/**
 * Represents a message structure from PRTG Network Monitor
 * @interface PRTGMessage
 * @property {string} datetime - The formatted date and time of the message
 * @property {number} [datetime_raw] - The raw timestamp of the message
 * @property {string} message - The content of the message
 * @property {string} status - The status of the message (e.g., "Error", "Warning", "OK")
 * @property {number} [time] - Optional time value associated with the message
 * @property {string} [title] - Optional title of the message
 * @property {string} [text] - Optional additional text content
 * @property {string[]} [tags] - Optional array of tags associated with the message
 * @property {string} [type] - Optional type classification of the message
 * @property {string} [parent] - Optional parent identifier or reference
 */
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

/**
 * Represents a PRTG annotation message structure.
 * @interface PRTGAnnotationMessage
 * @property {number} time - The timestamp of the annotation message
 * @property {string} title - The title of the annotation message
 * @property {string} text - The content text of the annotation message
 * @property {string[]} tags - Array of tags associated with the annotation message
 */
export interface PRTGAnnotationMessage {
  time: number;
  title: string;
  text: string;
  tags: string[];
}

/**
 * Represents a message structure for annotations.
 * 
 * @interface AnnotationMessage
 * @property {number} time - The timestamp of the annotation message
 * @property {string} title - The title of the annotation message
 * @property {string} text - The main content text of the annotation message
 * @property {string[]} [tags] - Optional array of tags associated with the annotation
 * @property {any} [annotation] - Optional additional annotation data
 */
export interface AnnotationMessage {
  time: number;
  title: string;
  text: string;
  tags?: string[];
  annotation?: any;
}

/**
 * Represents the structure of an annotation response.
 * @interface AnnotationResponse
 * @property {number} time - The timestamp of the annotation
 * @property {string} title - The title of the annotation
 * @property {string} text - The text content of the annotation
 * @property {string[]} [tags] - Optional array of tags associated with the annotation
 * @property {any} [annotation] - Optional additional annotation data of any type
 */
export interface AnnotationResponse {
  time: number;
  title: string;
  text: string;
  tags?: string[];
  annotation?: any;
}

/**
 * Represents the structure of a response from the PRTG Data Source API
 * @interface
 * @property {DataPoint[]} [datapoints] - Array of data points
 * @property {any[]} [groups] - Array of PRTG groups
 * @property {any[]} [devices] - Array of PRTG devices
 * @property {PRTGSensorData[]} [sensors] - Array of PRTG sensor data
 * @property {any[]} [channels] - Array of channels
 * @property {string[]} [values] - Array of values
 * @property {string | number} [statusText] - Status message or code
 * @property {number} [status] - HTTP status code
 * @property {ValueData[]} [histdata] - Array of historical data
 * @property {any} [sensordata] - Sensor-specific data
 * @property {PRTGMessage[]} [messages] - Array of PRTG messages
 * @property {string} [Version] - API version information
 */
export interface DataSourceResponse {
  datapoints?: DataPoint[];
  groups?: any[];
  devices?: any[];
  sensors?: PRTGSensorData[];
  channels?: any[];
  values?: string[];
  statusText?: string | number;
  status?: number;
  histdata?: ValueData[];
  sensordata?: any;
  messages?: PRTGMessage[];
  Version?: string;
}

/**
 * Represents a metric find value that extends the Grafana metric find value interface.
 * @interface MetricFindValue
 * @extends {GrafanaMetricFindValue}
 * @property {string} text - The display text of the metric find value
 * @property {string} [value] - Optional value associated with the metric find value
 * @property {boolean} [expandable] - Optional flag indicating if the metric find value can be expanded
 */
export interface MetricFindValue extends GrafanaMetricFindValue {
  text: string;
  value?: string;
  expandable?: boolean; // Changed from number to boolean
}

/**
 * Represents a template filter used for filtering PRTG data.
 * @interface TemplateFilter
 * @property {'group' | 'device' | 'sensor' | 'channel'} type - The type of filter to apply
 * @property {string} filter - The filter expression
 * @property {string} [filterExpression] - Optional additional filter expression
 */
export interface TemplateFilter {
  type: 'group' | 'device' | 'sensor' | 'channel';
  filter: string;
  filterExpression?: string;
}


/**
 * Configuration interface for PRTG data source plugin.
 * @interface PRTGDataSourceConfig
 * @extends DataSourceJsonData
 * 
 * @property {string} [apiUrl] - The URL of the PRTG API endpoint
 * @property {string} [username] - Username for PRTG authentication
 * @property {string} [hostname] - Hostname of the PRTG server
 * @property {string} [passhash] - Password hash for PRTG authentication
 * @property {number} [cacheTimeout] - Cache timeout in seconds
 * @property {boolean} [tzAutoAdjust] - Enable/disable automatic timezone adjustment
 * @property {number} [metricsLimit] - Maximum number of metrics to retrieve
 * @property {object} [oauth2] - OAuth2 configuration options
 * @property {boolean} oauth2.enabled - Enable/disable OAuth2 authentication
 * @property {string} [oauth2.tokenUrl] - OAuth2 token endpoint URL
 * @property {number} [timeout] - Request timeout in seconds
 */
export interface PRTGDataSourceConfig extends DataSourceJsonData {
  apiUrl?: string;
  username?: string;
  hostname?: string;
  passhash?: string;
  cacheTimeout?: number;
  tzAutoAdjust?: boolean;
  metricsLimit?: number;
  oauth2?: {
    enabled: boolean;
    tokenUrl?: string;
  };
  timeout?: number;
}


/**
 * Interface representing secure JSON data for authentication and API access.
 * @interface
 * @property {string} [apiKey] - Optional API key for authentication.
 * @property {string} [passhash] - Optional password hash for secure access.
 * @property {string} [clientId] - Optional client identifier for OAuth authentication.
 * @property {string} [clientSecret] - Optional client secret for OAuth authentication.
 */
export interface MySecureJsonData {
  apiKey?: string;
  passhash?: string;
  clientId?: string;
  clientSecret?: string;
}


/**
 * Interface representing secure JSON data for PRTG authentication.
 * @interface
 */
export interface PRTGSecureJsonData {
  passhash?: string;
}

/**
 * Interface representing the editor mode configuration for PRTG datasource
 * @interface PRTGEditorMode
 * @property {string} name - The display name of the editor mode
 * @property {string} value - The value associated with the editor mode
 * @property {Record<string, any>} filterProperty - Object containing filter properties and their configurations
 * @property {Record<string, any>} valueSource - Object containing value source configurations
 * @property {Record<string, any>} valueProperty - Object containing value property configurations
 */
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
/**
 * Interface representing default scope configurations for metrics.
 * @interface
 */
export interface ScopeDefaults {
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

/**
 * Interface representing options for PRTG queries.
 * @interface
 * @property {PRTGEditorMode} mode - The mode of the PRTG editor
 * @property {boolean} includeGroupName - Whether to include group names in the query results
 * @property {boolean} includeSensorName - Whether to include sensor names in the query results
 * @property {boolean} includeDeviceName - Whether to include device names in the query results
 * @property {{name: string, visible_name: string}} filterPropertyName - Property name used for filtering
 * @property {{name: string, visible_name: string}} propertyName - Property name configuration
 * @property {string} target - Target for the query
 * @property {{name: string, visible_name: string}} [deviceName] - Optional device name configuration
 * @property {{name: string, visible_name: string}} [sensorName] - Optional sensor name configuration
 * @property {{name: string, visible_name: string}} [groupName] - Optional group name configuration
 * @property {{name: string, visible_name: string}} [textProperty] - Optional text property configuration
 * @property {string} [multiplier] - Optional multiplier value
 * @property {boolean} [invertChannelFilter] - Optional flag to invert channel filtering
 */
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

  textProperty?: {
    name: string;
    visible_name: string;
  };
  multiplier?: string;
  invertChannelFilter?: boolean;
}

/**
 * Configuration interface for PRTG API client
 * 
 * @interface PRTGApiConfig
 * @property {string} baseUrl - The base URL of the PRTG server
 * @property {string} username - Username for authentication
 * @property {string} passwordHash - Password hash for authentication
 * @property {number} cacheTimeout - Cache timeout in milliseconds
 * @property {boolean} enableTimeZoneAdjust - Whether to enable timezone adjustment
 * @property {boolean} [useProxy] - Optional flag to use proxy
 * @property {number} [timeout] - Optional request timeout in milliseconds
 */
export interface PRTGApiConfig {
  baseUrl: string;
  username: string;
  passwordHash: string;
  cacheTimeout: number;
  enableTimeZoneAdjust: boolean;
  useProxy?: boolean;
  timeout?: number;
}

/**
 * Represents a data series from PRTG Network Monitor.
 * @interface PRTGSeries
 * @property {number} Time - The timestamp of the data point
 * @property {number} Value - The value of the data point
 * @property {any} [key: string] - Additional dynamic properties that may be present in the series
 */
export interface PRTGSeries {
  Time: number;
  Value: number;
  [key: string]: any;
}

/**
 * Represents a set of values from PRTG sensor data
 * @interface PrtgValues
 * @property {string} datetime - The timestamp of the sensor data
 * @property {(string|number)} [key: string] - Dynamic sensor values where the property name is the sensor field and the value can be either string or number
 */
export interface PrtgValues {
  datetime: string;
  [key: string]: string | number;
}

/**
 * Represents the response structure for historical data from PRTG API
 * @interface PRTGHistoricalResponse
 * @property {'prtg-version'} prtg-version - The version of PRTG server
 * @property {number} treesize - Size of the data tree
 * @property {PrtgValues[]} histdata - Array of historical values from PRTG
 */
export interface PRTGHistoricalResponse {
  'prtg-version': string;
  treesize: number;
  histdata: PrtgValues[];
}

export interface PRTGHistoricalData {
  histdata: PrtgValues[];
}
