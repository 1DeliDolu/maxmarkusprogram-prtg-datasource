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
    this.passhash = instanceSettings.jsonData.passhash || '';

    const config: PRTGApiConfig = {
      baseUrl: `https://${instanceSettings.jsonData.hostname}/api/`,
      username: instanceSettings.jsonData.username || '',
      passwordHash: instanceSettings.jsonData.passhash || '',
      cacheTimeout: this.parseTimeout(instanceSettings.jsonData.cacheTimeout, 300),
      enableTimeZoneAdjust: instanceSettings.jsonData.tzAutoAdjust || false,
      useProxy: true,
      timeout: this.parseTimeout(instanceSettings.jsonData.timeout, 30000),
    };

    this.api = new PRTGApi(config);
    this.templateSrv = getTemplateSrv();
  }

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
