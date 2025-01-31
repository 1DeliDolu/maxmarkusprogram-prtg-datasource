/**
 * A data source implementation for PRTG Network Monitor integration with Grafana.
 * This class handles all communication between Grafana and PRTG Network Monitor.
 * @author Mustafa Özdemir
 * 
 * @extends DataSourceApi<PRTGQuery>, PRTGDataSourceConfig>
 * 
 * @property {string} pluginId - Unique identifier for the PRTG Grafana datasource plugin
 * @property {PRTGApi} api - Instance of PRTG API client for making requests
 * @property {TemplateSrv} templateSrv - Grafana template service for variable interpolation
 * @property {string} baseUrl - Base URL for the PRTG API endpoints
 * @property {string} username - Username for PRTG authentication
 * @property {string} passhash - Password hash for PRTG authentication
 * 
 * @remarks
 * This data source supports:
 * - Querying PRTG sensors, devices, and groups
 * - Both raw and text-based data retrieval
 * - Historical data queries with time range support
 * - Metric visualization with customizable display options
 * - Authentication testing and connection validation
 * - Annotation support for timeline events
 * 
 * @example
 * ```typescript
 * const settings = {
 *   jsonData: {
 *     hostname: 'prtg.example.com',
 *     username: 'admin',
 *     passhash: 'hashedpassword'
 *   }
 * };
 * const datasource = new PRTGDataSource(settings);
 * ```
 */

import { getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  FieldType,
  Field,
  createDataFrame,
  AnnotationSupport,
  DataFrame,
  LoadingState,
} from '@grafana/data';
import { PRTGDataSourceSettings, TestDataSourceResponse } from './types/interface.datasource';
import { PRTGQuery, PRTGDataSourceConfig, PRTGApiConfig, PRTGAnnotationQuery } from './types';
import { PRTGQueryItem } from './types/interfaces'; 
//@ts-ignore
import _ from 'lodash';

import { PRTGApi } from './Api';


export class PRTGDataSource extends DataSourceApi<PRTGQuery, PRTGDataSourceConfig> {
  static readonly pluginId = 'prtg-grafana-datasource';

  readonly api: PRTGApi;
  readonly templateSrv: TemplateSrv;
  readonly baseUrl: string;
  readonly username: string;
  readonly passhash: string;

  constructor(instanceSettings: PRTGDataSourceSettings) {
    const settings = {
      ...instanceSettings,
      type: PRTGDataSource.pluginId,
      id: typeof instanceSettings.id === 'string' ? parseInt(instanceSettings.id, 10) : instanceSettings.id || 0,
    };
    super(settings);
    this.baseUrl = `https://${instanceSettings.jsonData.hostname}/api/`;
    this.username = instanceSettings.jsonData.username || '';
    this.passhash = instanceSettings.jsonData?.passhash || '';

    const config: PRTGApiConfig = {
      baseUrl: `https://${instanceSettings.jsonData.hostname}/api/`,
      username: instanceSettings.jsonData.username || '',
      passwordHash: instanceSettings.jsonData?.passhash || '',
      cacheTimeout: this.parseTimeout(instanceSettings.jsonData.cacheTimeout, 300),
      enableTimeZoneAdjust: instanceSettings.jsonData.tzAutoAdjust || false,
      useProxy: true,
      timeout: this.parseTimeout(instanceSettings.jsonData.timeout, 30000),
    };

    this.api = new PRTGApi(config);
    this.templateSrv = getTemplateSrv();
  }

  /**
   * Parses and validates a timeout value, ensuring a valid number is returned
   * @param value - The timeout value to parse, can be a string, number, or undefined
   * @param defaultValue - The fallback value to use if parsing fails or value is undefined
   * @returns A valid numeric timeout value, either the parsed input or the default value
   * 
   * @example
   * parseTimeout('300', 1000) // returns 300
   * parseTimeout(undefined, 1000) // returns 1000
   * parseTimeout('invalid', 1000) // returns 1000
   */
  private parseTimeout(value: string | number | undefined, defaultValue: number): number {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    if (typeof value === 'number') {
      return value;
    }
    return defaultValue;
  }

  /**
   * Converts a PRTG datetime string into a Unix timestamp (milliseconds).
   * 
   * @param datetime - PRTG datetime string in format "DD.MM.YYYY HH:mm:ss" or "DD.MM.YYYY"
   * @returns number - Unix timestamp in milliseconds
   * 
   * @example
   * Returns timestamp for "24.12.2023 15:30:45"
   * parsePRTGDateTime("24.12.2023 15:30:45")
   * 
   * Returns timestamp for "24.12.2023" (time will be set to 00:00:00)
   * parsePRTGDateTime("24.12.2023")
   */
  private parsePRTGDateTime(datetime: string): number {
    const [datePart, timePart] = datetime.split(' ');
    const [day, month, year] = datePart.split('.');
    const [hour, minute, second] = (timePart || '00:00:00').split(':');

    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second || '0', 10)
    ).getTime();
  }

  /**
   * Executes queries against the PRTG API based on the provided query options.
   * Handles different query types including 'text', 'raw', and time series data.
   * 
   * @param options - The query request options containing targets and time range
   * @param options.range - Time range for the query
   * @param options.targets - Array of query targets containing query configuration
   * 
   * @returns Promise<DataQueryResponse> containing:
   *  - data: Array of DataFrames with query results
   *  - state: LoadingState indicating query execution status
   * 
   * @throws Will return an error state if the query fails
   * 
   * @remarks
   * Supports three main query types:
   * 1. 'text' - Retrieves text-based information for groups, devices, or sensors
   * 2. 'raw' - Retrieves raw values for groups, devices, or sensors
   * 3. Time series - Retrieves historical data for selected sensors and metrics
   * 
   * Each query type creates appropriate data frames with:
   * - Timestamp fields
   * - Metric values (string or number)
   * - Proper field configurations and display names
   */
  async query(options: DataQueryRequest<PRTGQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const fromTime = range!.from.valueOf();
    const toTime = range!.to.valueOf();

    try {
      const promises = options.targets.map(async (target) => {
        if (target.queryType === 'text') {
          let response: any;
          let fields: Array<Partial<Field>> = [];

          const propertyType = target.propertySelection?.name;
          const filterProperty = target.filterPropertySelection?.name || 'status';

          switch (propertyType) {
            case 'group':
              response = await this.api.getGroupInfo(target.groupSelection?.name || '*');
              const groupTimestamp = this.parsePRTGDateTime(response.datetime);

              fields = [
                {
                  name: 'Time',
                  type: FieldType.time,
                  values: [groupTimestamp],
                  config: {},
                },
                {
                  name: filterProperty,
                  type: FieldType.string,
                  values: [response?.[filterProperty] ?? ''],
                  config: { displayName: `${response.group} - ${filterProperty}` },
                },
              ];
              break;

            case 'device':
              response = await this.api.getDeviceInfo(target.deviceSelection?.name || '*');
              const timestamp = this.parsePRTGDateTime(response.datetime);

              fields = [
                {
                  name: 'Time',
                  type: FieldType.time,
                  values: [timestamp],
                  config: {},
                },
                {
                  name: filterProperty,
                  type: FieldType.string,
                  values: [response?.[filterProperty] ?? ''],
                  config: {
                    displayName: `${response.group} - ${response.device} - ${filterProperty}`,
                  },
                },
              ];
              break;

            case 'sensor':
              response = await this.api.getSensorInfo(target.sensorSelection?.name || '*');
              const sensorTimestamp = this.parsePRTGDateTime(response.datetime);

              fields = [
                {
                  name: 'Time',
                  type: FieldType.time,
                  values: [sensorTimestamp],
                  config: {},
                },
                {
                  name: filterProperty,
                  type: FieldType.string,
                  values: [response?.[filterProperty] ?? ''],
                  config: {
                    displayName: `${response.group} - ${response.device} - ${response.sensor} -${filterProperty}`,
                  },
                },
              ];
              break;

            default:
              console.warn('Unknown property type:', propertyType);
              return null;
          }

          return createDataFrame({
            refId: target.refId,
            name: `PRTG ${propertyType} ${filterProperty}`,
            fields: fields,
          });
        }

        if (target.queryType === 'raw') {
          let response: any;
          let fields: Array<Partial<Field>> = [];

          const propertyType = target.propertySelection?.name;
          const filterProperty = target.filterPropertySelection?.name || 'status_raw';
          switch (propertyType) {
            case 'group':
              response = await this.api.getGroupInfo(target.groupSelection?.name || '*');
              const groupTimestamp = this.parsePRTGDateTime(response.datetime);

              fields = [
                {
                  name: 'Time',
                  type: FieldType.time,
                  values: [groupTimestamp],
                  config: {},
                },
                {
                  name: filterProperty,
                  type: filterProperty.endsWith('_raw') ? FieldType.number : FieldType.string,
                  values: [response[`${filterProperty}_raw`] ?? ''],
                  config: {
                    displayName: `${response.group} - ${filterProperty}`,
                  },
                },
              ];
              break;

            case 'device':
              response = await this.api.getDeviceInfo(target.deviceSelection?.name || '*');
              const deviceTimestamp = this.parsePRTGDateTime(response.datetime);

              fields = [
                {
                  name: 'Time',
                  type: FieldType.time,
                  values: [deviceTimestamp],
                  config: {},
                },
                {
                  name: filterProperty,
                  type: filterProperty.endsWith('_raw') ? FieldType.number : FieldType.string,
                  values: [response[`${filterProperty}_raw`] ?? ''],
                  config: {
                    displayName: `${response.group} - ${response.device} - ${filterProperty}`,
                  },
                },
              ];
              break;

            case 'sensor':
              response = await this.api.getSensorInfo(target.sensorSelection?.name || '*');
              const sensorTimestamp = this.parsePRTGDateTime(response.datetime);

              fields = [
                {
                  name: 'Time',
                  type: FieldType.time,
                  values: [sensorTimestamp],
                  config: {},
                },
                {
                  name: filterProperty,
                  type: filterProperty.endsWith('_raw') ? FieldType.number : FieldType.string,
                  values: [response[`${filterProperty}_raw`] ?? ''],
                  config: {
                    displayName: `${response.group} - ${response.device}- ${response.sensor}- ${filterProperty}`,
                  },
                },
              ];
              break;

            default:
              console.warn('Unknown property type:', propertyType);
              return null;
          }

          return createDataFrame({
            refId: target.refId,
            name: `PRTG ${propertyType} ${filterProperty}`,
            fields: fields,
          });
        }

        if (!target.valueSelection?.name) {
          return null;
        }

        try {
          // Extract sensor ID from the selection
          const sensorName = target.sensorSelection?.name;
          if (!sensorName) {
            console.error('No sensor selected');
            return null;
          }

          // Try to get sensor info first to get the correct ID
          try {
            const sensorInfo = await this.api.getSensorInfo(sensorName);
            const sensorId = sensorInfo.objid;

            if (!sensorId) {
              console.error('Could not find sensor ID for:', sensorName);
              return null;
            }

            const queryItems: PRTGQueryItem[] = [{
              sensorId: sensorId,
              channelId: target.channelSelection?.name,
              name: target.valueSelection?.name
            }];

            const response = await this.api.performQuerySuggestQuery(fromTime, toTime, queryItems);
            const histData = response.histdata;

            if (!Array.isArray(histData) || histData.length === 0) {
              console.error('No data points in response');
              return null;
            }

            const firstPoint = histData[0];
            const availableMetrics = Object.keys(firstPoint).filter((key) => key !== 'datetime');

            const selectedValues = target.valueSelection.name
              .split(',')
              .map((v) => v.trim())
              .filter((v) => availableMetrics.includes(v));

            if (selectedValues.length === 0) {
              selectedValues.push(...availableMetrics);
            }

            const times = histData.map((item) => this.parsePRTGDateTime(String(item.datetime)));

            const fields = [
              {
                name: 'Time',
                type: FieldType.time,
                values: times,
                config: {},
              },
            ];

            selectedValues.forEach((metric) => {
              const values = histData
                .map((item) => {
                  const rawValue = item[metric];
                  const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
                  return isNaN(value) ? null : value;
                })
                .filter((v): v is number => v !== null);

              const displayParts = [];
              if (target.options?.includeGroupName && target.groupSelection?.name) {
                displayParts.push(target.groupSelection.name);
              }
              if (target.options?.includeDeviceName && target.deviceSelection?.name) {
                displayParts.push(target.deviceSelection.name);
              }
              if (target.options?.includeSensorName && target.sensorSelection?.name) {
                displayParts.push(target.sensorSelection.name);
              }
              displayParts.push(metric);

              const displayName = displayParts.join(' - ');

              fields.push({
                name: metric,
                type: FieldType.number,
                values: values,
                config: {
                  displayName,
                  custom: {
                    drawStyle: 'line',
                    lineWidth: 1,
                    pointSize: 5,
                  },
                },
              });
            });

            const frameName =
              _([target.groupSelection?.name, target.deviceSelection?.name, target.sensorSelection?.name])
                .compact()
                .join(' - ') || 'PRTG Data';

            return createDataFrame({
              refId: target.refId,
              name: frameName,
              fields: fields,
            });
          } catch (sensorError) {
            console.error(`Failed to get sensor info for: ${sensorName}`, sensorError);
            return null;
          }

        } catch (error) {
          console.error(`Query failed for target ${target.refId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((result): result is DataFrame => result !== null);

      return {
        data: validResults,
        state: validResults.length > 0 ? LoadingState.Done : LoadingState.Error,
      };
    } catch (error) {
      console.error('Query failed:', error);
      return {
        data: [],
        state: LoadingState.Error,
      };
    }
  }

  /**
   * Tests the connection to the PRTG server and validates authentication.
   * 
   * @async
   * @returns {Promise<TestDataSourceResponse>} A promise that resolves to a TestDataSourceResponse object
   * containing the status of the connection test:
   * - On success: Returns status 'success' with PRTG version info
   * - On auth failure: Returns status 'error' with authentication error details
   * - On connection error: Returns status 'error' with connection failure details
   * 
   * @throws {Error} If there are connectivity or authentication issues with the PRTG server
   * 
   * @example
   * const response = await datasource.testDatasource();
   * if (response.status === 'success') {
   *   console.log('Connected to PRTG successfully');
   * }
   */
  async testDatasource(): Promise<TestDataSourceResponse> {
    try {
      // Test API connectivity
      const apiVersion = await this.api.getVersion();

      // Test authentication
      const authTest = await this.api.testAuth();
      if (!authTest) {
        return {
          status: 'error',
          message: 'Authentication failed',
          details: {
            message: 'Failed to authenticate with PRTG server',
            verboseMessage: 'Please check your credentials and try again',
          },
        };
      }

      return {
        status: 'success',
        message: `Successfully connected to PRTG ${apiVersion}`,
        details: {
          message: `Connected to PRTG server`,
          verboseMessage: `Version: ${apiVersion}`,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Connection failed',
        details: {
          message: 'Could not connect to PRTG server',
          verboseMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Configuration for PRTG annotation support
   * @property {Object} annotations - Annotation support configuration object
   * @property {Function} prepareQuery - Prepares a PRTG query from annotation data
   * @param {PRTGAnnotationQuery} anno - The annotation query parameters
   * @returns {PRTGQuery | undefined} Returns a configured PRTG query object or undefined if no sensorId is provided
   *
   * The prepareQuery function:
   * - Validates if annotation has a sensorId
   * - Sets up default query options
   * - Configures sensor, group, device and channel selections
   * - Returns a fully formed PRTGQuery object with all necessary parameters
   */
  annotations: AnnotationSupport<PRTGQuery> = {
    prepareQuery: (anno: PRTGAnnotationQuery) => {
      if (!anno.annotation.sensorId) {
        return undefined;
      }

      const defaultOptions = {
        mode: { name: 'Metrics', value: 'Metrics', filterProperty: {}, valueSource: {}, valueProperty: {} },
        includeGroupName: false,
        includeSensorName: false,
        includeDeviceName: false,
        propertyName: { name: '', visible_name: '' },
        filterPropertyName: { name: '', visible_name: '' },
        target: anno.annotation.sensorId.toString() // Add target property
      };

      return {
        refId: 'annotations',
        queryType: 'metrics',
        sensorSelection: { name: anno.annotation.sensorId.toString() },
        groupSelection: { name: '*' },
        deviceSelection: { name: '*' },
        channelSelection: { name: '*' },
        propertySelection: { name: '' },
        filterPropertySelection: { name: '' },
        rawRequest: { endpoint: '', parameters: '' },
        transformations: [],
        options: defaultOptions,
        queryOptions: {
          ...defaultOptions,
          displayMode: { name: 'Metrics', value: 'Metrics', filterProperty: {}, valueSource: {}, valueProperty: {} },
          textProperty: { name: '', visible_name: '' }
        }
      } as PRTGQuery;
    },
  };
}
