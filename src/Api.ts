/**
 * Class representing a PRTG API client that handles communication with PRTG Network Monitor.
 * 
 * @author Mustafa Özdemir
 * @class PRTGApi
 * @description Provides methods to interact with PRTG Network Monitor's API endpoints,
 * including authentication, data retrieval, and query operations.
 * 
 * @example
 * ```typescript
 * const config: PRTGApiConfig = {
 *   baseUrl: 'https://prtg.example/api/',
 *   username: 'admin',
 *   passwordHash: 'hashedPassword',
 *   cacheTimeout: 300,
 *   enableTimeZoneAdjust: true
 * };
 * 
 * const api = new PRTGApi(config);
 * const version = await api.getVersion();
 * ```
 * 
 * @property {PRTGApiConfig} config - Configuration settings for the PRTG API client
 * @property {CacheService} cacheService - Service handling response caching
 * @property {number} tzAutoAdjustValue - Time zone adjustment value in milliseconds
 * @property {number} sensorId - Current sensor ID being queried
 * 
 * @throws {PRTGError} When API requests fail or authentication is invalid
 * @throws {Error} When required configuration is missing or invalid
 * 
 * @see {@link PRTGApiConfig} for configuration options
 * @see {@link CacheService} for caching implementation
 * @see {@link PRTGError} for error handling
 */
import axios from 'axios';
import { CacheService } from './services/CacheService';
import { PRTGError } from './services/PRTGError';
import {
  PRTGApiConfig,
  PRTGResponse,
  PRTGDevice,
  PRTGSensor,
  PRTGChannel,
  SortableItem,
  PRTGGroup,
  PRTGMessage,
  PRTGQueryItem
} from './types/interfaces';
import _ from 'lodash';
import { from, catchError, map, lastValueFrom } from 'rxjs';

export class PRTGApi {
  private readonly config: PRTGApiConfig;
  // @ts-ignore
  private readonly cacheService: CacheService;
  // @ts-ignore
  private tzAutoAdjustValue = 0;
  private sensorId;

  constructor(config: PRTGApiConfig) {
    this.config = config;
    this.cacheService = new CacheService(config.cacheTimeout || 300);
    this.sensorId = 0;
    if (config.enableTimeZoneAdjust) {
      this.initializeTimeZoneOffset();
    }
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }
  get username(): string {
    return this.config.username;
  }
  get passwordHash(): string {
    return this.config.passwordHash;
  }
  get cacheTimeout(): number {
    return this.config.cacheTimeout || 300;
  }
  get enableTimeZoneAdjust(): boolean {
    return this.config.enableTimeZoneAdjust || false;
  }

  /**
   * Executes an HTTP GET request to the PRTG API endpoint with authentication.
   * @template T - The expected type of the response data
   * @param {string} endpoint - The API endpoint to call (e.g., 'table.json')
   * @param {URLSearchParams | string} [params] - Optional URL parameters to append to the request
   * @returns {Promise<PRTGResponse>} A promise that resolves to the PRTG API response
   * @throws {PRTGError} When the response contains no data, authentication fails, or other API errors occur
   * @private
   * @async 
   * @example
   * const response = await executeRequest<SensorData>('table.json', 'content=sensors&columns=name,status');
   */
  private async executeRequest<T>(endpoint: string, params?: URLSearchParams | string): Promise<PRTGResponse> {
    const baseApiUrl = this.baseUrl;
    const fullUrl = baseApiUrl + endpoint;

    const authParams = `username=${this.username}&passhash=${this.passwordHash}`;
    const finalParams = params ? `${authParams}&${params}` : authParams;
    const url = `${fullUrl}?${finalParams}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.data) {
        throw new PRTGError('Response contained no data');
      }

      if (endpoint.includes('table.json') && response.data['prtg-version']) {
        return response.data as PRTGResponse;
      }

      return this.processResponse<PRTGResponse>(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        throw new PRTGError('Access denied. Please verify authentication and permissions.');
      }
      throw this.handleRequestError(error);
    }
  }


  /**
   * Processes and transforms the raw API response into the expected format.
   * @template PRTGResponse - The expected response type
   * @param {any} data - Raw response data from the PRTG API
   * @returns {PRTGResponse} Processed response data
   * @throws {Error} When the response contains insufficient monitoring data
   * @private
   */
  private processResponse<PRTGResponse>(data: any): PRTGResponse {
    // Direct return if it's the status response with Version field
    if (data && data.Version) {
      return data as PRTGResponse;
    }

    if (data['prtg-version']) {
      if (data.groups) {
        return data.groups as PRTGResponse;
      }
      return data as PRTGResponse;
    }

    const responseTypes = {
      groups: true,
      devices: true,
      sensors: true,
      channels: true,
      values: true,
      sensordata: true,
      messages: true,
    };

    for (const type in responseTypes) {
      if (data[type]) {
        return data[type];
      }
    }

    if (data === 'Not enough monitoring data') {
      throw new Error(`Not enough monitoring data.`);
    }

    return data;
  }

  /**
   * Handles errors that occur during API requests.
   * @param {any} error - The error object thrown during the request
   * @throws {PRTGError} When the error is an Axios error or an unknown error
   * @private
   */
  private handleRequestError(error: any): void {
    console.error('PRTG API Request failed:', error);
    if (axios.isAxiosError(error)) {
      throw PRTGError.fromAxiosError(error);
    }
    throw new PRTGError(error.message || 'Unknown error');
  }



  /**
   * Initializes the time zone offset value for adjusting PRTG timestamps.
   * 
   * @returns {Promise<void>} A promise that resolves when the time zone offset is initialized
   * 
   * @private
   * @async
   */
  private async initializeTimeZoneOffset(): Promise<void> {
    if (!this.enableTimeZoneAdjust) {
      return;
    }

    try {
      const response = await this.executeRequest('table.json?');
      const jsClock = response.jsClock;
      const localTs = Date.now() / 1000;
      this.tzAutoAdjustValue = Math.round(localTs - jsClock) * 1000;
    } catch (error) { }
  }


  /**
   * Retrieves the version information from the PRTG API.
   * 
   * @returns A Promise that resolves to a string containing the version information.
   *          The version can come from either the 'Version' or 'prtg-version' field in the response.
   *          Returns 'Unknown Version' if no version field is found.
   *          Returns an error message string prefixed with 'ERROR:' if the request fails.
   * 
   * @throws {Error} When the API request fails or response cannot be processed.
   *                 The error message will contain details about the failure.
   * 
   * @example
   * try {
   *   const version = await api.getVersion();
   *   console.log(version); // e.g., "22.1.76.1869" or "ERROR: Network request failed"
   * } catch (error) {
   *   console.error(error);
   * }
   */
  async getVersion(): Promise<string> {
    try {
      return lastValueFrom(
        from(this.executeRequest<PRTGResponse>('status.json')).pipe(
          map((response) => {
            // Check for direct Version field in response
            if (response && typeof response === 'object' && 'Version' in response) {
              return response.Version;
            }
            // Fallback to prtg-version if exists
            if (response && typeof response === 'object' && 'prtg-version' in response) {
              return response['prtg-version'];
            }
            return 'Unknown Version';
          }),
          catchError((error) => {
            console.error('Failed to get version:', error);
            throw new Error(`Version query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          })
        )
      );
    } catch (error) {
      console.error('Failed to get version:', error);
      return `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }


  /**
   * Sorts an array of items based on a specified field.
   * @template SortList - The type of items in the array, extending SortableItem
   * @param {SortList[]} items - The array of items to sort
   * @param {keyof SortList} field - The field to sort the items by
   * @returns {SortList[]} The sorted array of items 
   * @private
   */
  private sortItems<SortList extends SortableItem>(items: SortList[], field: keyof SortList): SortList[] {
    return _.orderBy(items, [field], ['asc']);
  }
  private readonly columns = [
    'objid',
    'group',
    'device',
    'sensor',
    'channel',
    'active',
    'message',
    'priority',
    'status',
    'status_raw',
    'tags',
    'datetime',
  ].join(',');


  /**
   * Performs a query to fetch and suggest PRTG groups.
   * 
   * This method queries the PRTG API for available groups using table.json endpoint.
   * The results are sorted and transformed into PRTGGroup objects.
   * 
   * @returns {Promise<PRTGGroup[]>} A promise that resolves to an array of PRTGGroup objects
   * 
   * @throws {Error} When no group data is received from PRTG
   * @throws {Error} When the group query fails for any reason
   * 
   * @example
   * const groups = await performGroupSuggestQuery();
   */
  async performGroupSuggestQuery(): Promise<PRTGGroup[]> {
    try {
      const params = new URLSearchParams({
        content: 'groups',
        count: '50000',
        columns: this.columns,
      });

      return lastValueFrom(
        from(this.executeRequest<PRTGResponse>('table.json', params)).pipe(
          map((response) => {
            if (!response?.groups) {
              throw new Error('No group data received from PRTG');
            }
            return this.sortItems(response.groups, 'group');
          }),
          catchError((error) => {
            console.error('Failed to perform group suggest query:', error);
            throw new Error(`Group query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          })
        )
      );
    } catch (error) {
      console.error('Failed to perform group suggest query:', error);
      throw new Error(`Group query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Performs a query to suggest PRTG devices, optionally filtered by group.
   * 
   * @param groupFilter - Optional group filter parameter. Can be in format 'filter_group=value' or just the filter value
   * @returns Promise that resolves to an array of PRTGDevice objects
   * @throws Error if no device data is received from PRTG or if the query fails
   * 
   * @example
   *  Without group filter
   * await performDeviceSuggestQuery();
   * 
   * With group filter
   * await performDeviceSuggestQuery('filter_group=MyGroup');
   *  or
   * await performDeviceSuggestQuery('MyGroup');
   */
  async performDeviceSuggestQuery(groupFilter?: string): Promise<PRTGDevice[]> {
    try {
      const params = new URLSearchParams({
        content: 'devices',
        count: '50000',
        columns: this.columns,
      });

      if (groupFilter) {
        const filterValue = groupFilter.startsWith('filter_group=')
          ? decodeURIComponent(groupFilter.split('=')[1])
          : groupFilter;
        params.append('filter_group', filterValue);
      }

      return lastValueFrom(
        from(this.executeRequest<PRTGResponse>('table.json', params)).pipe(
          map((response) => {
            if (!response?.devices) {
              throw new Error('No device data received from PRTG');
            }
            return this.sortItems(response.devices, 'device');
          }),
          catchError((error) => {
            console.error('Failed to perform device suggest query:', error);
            throw new Error(`Device query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          })
        )
      );
    } catch (error) {
      console.error('Failed to query devices:', error);
      throw new Error(`Device query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Performs a query to suggest sensors from PRTG based on an optional device filter.
   * 
   * @param deviceFilter - Optional filter string to filter sensors by device. Can be in format 'filter_device=value' or just 'value'
   * @returns Promise<PRTGSensor[]> - Returns a promise that resolves to an array of PRTG sensors
   * @throws {Error} Throws an error if no sensor data is received or if the query fails
   * 
   * @example
   * Get all sensors
   * const sensors = await performSensorSuggestQuery();
   * 
   * Get sensors filtered by device
   * const filteredSensors = await performSensorSuggestQuery('myDevice');
   * 
   * Get sensors with explicit filter
   * const explicitFilteredSensors = await performSensorSuggestQuery('filter_device=myDevice');
   */
  async performSensorSuggestQuery(deviceFilter?: string): Promise<PRTGSensor[]> {
    try {
      const params = new URLSearchParams({
        content: 'sensors',
        count: '50000',
        columns: this.columns,
      });

      if (deviceFilter) {
        const filterValue = deviceFilter.startsWith('filter_device=')
          ? decodeURIComponent(deviceFilter.split('=')[1])
          : deviceFilter;

        params.append('filter_device', filterValue);
      }

      return lastValueFrom(
        from(this.executeRequest<PRTGResponse>('table.json', params)).pipe(
          map((response) => {
            if (!response?.sensors) {
              throw new Error('No sensor data received from PRTG');
            }
            return this.sortItems(response.sensors, 'sensor');
          }),
          catchError((error) => {
            console.error('Failed to perform sensor suggest query:', error);
            throw new Error(`Sensor query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          })
        )
      );
    } catch (error) {
      console.error('Failed to query sensors:', error);
      throw new Error(`Sensor query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // TODO : OK
  /**
   * Performs a channel suggestion query to the PRTG API, retrieving sensor data based on optional filters.
   *
   * @description
   * This method queries the PRTG API for sensor data using the table.json endpoint. It supports filtering
   * by group, device, and sensor names. The results are sorted and transformed into PRTGChannel objects.
   *
   * @example
   * ```typescript
   * const api = new PRTGApi();
   * const channels = await api.performChannelSuggestQuery('MyGroup', 'MyDevice', 'MySensor');
   * ```
   *
   * @param {string} [groupFilter] - Optional filter for group name. Can be a plain string or 'filter_group=value' format
   * @param {string} [deviceFilter] - Optional filter for device name. Can be a plain string or 'filter_device=value' format
   * @param {string} [sensorFilter] - Optional filter for sensor name. Can be a plain string or 'filter_sensor=value' format
   *
   * @returns {Promise<PRTGChannel[]>} A promise that resolves to an array of PRTGChannel objects
   *
   * @throws {Error} When no sensor data is received from PRTG
   * @throws {Error} When the channel query fails due to network or API issues
   */
  async performChannelSuggestQuery(
    groupFilter?: string,
    deviceFilter?: string,
    sensorFilter?: string
  ): Promise<PRTGChannel[]> {
    try {
      const params = new URLSearchParams({
        content: 'sensors',
        count: '50000',
        columns: this.columns,
      });

      if (groupFilter) {
        const filterValue = groupFilter.startsWith('filter_group=')
          ? decodeURIComponent(groupFilter.split('=')[1])
          : groupFilter;
        params.append('filter_group', filterValue);
      }

      if (deviceFilter) {
        const filterValue = deviceFilter.startsWith('filter_device=')
          ? decodeURIComponent(deviceFilter.split('=')[1])
          : deviceFilter;
        params.append('filter_device', filterValue);
      }

      if (sensorFilter) {
        const filterValue = sensorFilter.startsWith('filter_sensor=')
          ? decodeURIComponent(sensorFilter.split('=')[1])
          : sensorFilter;
        params.append('filter_sensor', filterValue);
      }

      return lastValueFrom(
        from(this.executeRequest<PRTGResponse>('table.json', params)).pipe(
          map((response) => {
            if (!response?.sensors) {
              throw new Error('No sensor data received from PRTG');
            }
            return this.sortItems(response.sensors, 'sensor');
          }),
          catchError((error) => {
            console.error('Failed to perform channel suggest query:', error);
            throw new Error(`Channel query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          })
        )
      );
    } catch (error) {
      console.error('Failed to query channels:', error);
      throw new Error(`Channel query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // TODO : OK
  /**
   * Performs a value suggestion query based on filter parameters
   * 
   * @param groupFilter - The filter string for groups
   * @param deviceFilter - The filter string for devices
   * @param sensorFilter - The filter string for sensors
   * @param channelFilter - The filter string for channels
   * 
   * @returns Promise that resolves to an array of values. Returns empty array if:
   * - channelFilter is empty
   * - No valid sensor ID is found
   * - No values are returned from PRTG
   * - Any error occurs during the request
   * 
   * @remarks
   * This method first performs a channel suggest query to get a sensor ID if channelFilter is provided.
   * Then uses that sensor ID to fetch actual values from PRTG's table.json endpoint.
   * The values include 'value_' and 'datetime' columns in JSON format.
   */
  async performValueSuggestQuery(
    groupFilter: string,
    deviceFilter: string,
    sensorFilter: string,
    channelFilter: string
  ): Promise<any[]> {
    try {
      if (channelFilter.length > 0) {
        const res = await this.performChannelSuggestQuery(groupFilter, deviceFilter, sensorFilter);
        if (!res?.[0]?.objid) {
          return [];
        }

        this.sensorId = res[0].objid;

        const params = new URLSearchParams({
          content: 'values',
          columns: 'value_,datetime',
          usecaption: 'true',
          output: 'json',
          count: '1',
          id: this.sensorId.toString(),
        });

        const response = await this.executeRequest<PRTGResponse>('table.json', params);

        if (!response?.values?.[0]) {
          return [];
        }

        return response.values;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  // TODO : OK
  /**
   * Performs a historical data query for a specific sensor in PRTG.
   * 
   * @param sdate - The start date timestamp in milliseconds
   * @param edate - The end date timestamp in milliseconds
   * @param queries - Array of PRTG query items containing sensor and channel information
   * @returns Promise resolving to PRTGResponse containing historical data
   * 
   * @throws {Error} When queries array is empty or sensor ID is missing
   * @throws {Error} When sensor ID is invalid
   * @throws {Error} When no historical data is received from PRTG
   * @throws {Error} When the historical data query fails
   * 
   * @remarks
   * - Automatically calculates appropriate averaging interval based on time range
   * - Formats dates according to PRTG's required format (YYYY-MM-DD-HH-mm-ss)
   * - Supports optional channel filtering
   * - Limits results to 50000 data points
   * - Uses memoization for date formatting optimization
   */
  async performQuerySuggestQuery(sdate: number, edate: number, queries: PRTGQueryItem[]): Promise<PRTGResponse> {
    if (!queries || queries.length === 0 || !queries[0].sensorId) {
      throw new Error('Invalid query: Missing sensor ID');
    }

    const dateFrom = new Date(sdate).getTime() / 1000;
    const dateTo = new Date(edate).getTime() / 1000;
    const hours = (dateTo - dateFrom) / 3600;

    const avg: string = _.cond<number, string>([
      [(h: number): boolean => h > 12 && h < 36, (): string => '300'],
      [(h: number): boolean => h > 36 && h < 745, (): string => '3600'],
      [(h: number): boolean => h > 745, (): string => '86400'],
      [_.stubTrue, (): string => '0'],
    ])(hours);

    const formatDate = _.memoize((timestamp: number) => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${_.padStart(String(date.getMonth() + 1), 2, '0')}-${_.padStart(
        String(date.getDate()),
        2,
        '0'
      )}-${_.padStart(String(date.getHours()), 2, '0')}-${_.padStart(String(date.getMinutes()), 2, '0')}-${_.padStart(
        String(date.getSeconds()),
        2,
        '0'
      )}`;
    });

    try {
      // Validate sensor ID before making request
      const sensorId = Number(queries[0].sensorId);
      if (isNaN(sensorId)) {
        throw new Error('Invalid sensor ID');
      }

      const params = new URLSearchParams();
      params.append('id', sensorId.toString());
      params.append('avg', avg);
      params.append('sdate', formatDate(sdate));
      params.append('edate', formatDate(edate));
      params.append('count', '50000');
      params.append('usecaption', '1');
      params.append('columns', 'datetime,value_');

      // Only add channel parameter if it's a valid value
      if (queries[0].channelId && queries[0].channelId !== '*') {
        params.append('channel', queries[0].channelId);
      }

      const response = await this.executeRequest<PRTGResponse>('historicdata.json', params);

      if (!response.histdata || response.histdata.length === 0) {
        throw new Error('No historical data received from PRTG');
      }

      return response;
    } catch (error) {
      console.error('Failed to perform historical data query:', error);
      throw new Error(`Historical data query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // TODO : OK
  /**
   * Retrieves messages from PRTG within a specified time range for a given sensor
   * 
   * @param fromTime - Start timestamp in seconds since epoch
   * @param toTime - End timestamp in seconds since epoch  
   * @param sensorId - ID of the PRTG sensor to get messages from
   * 
   * @returns Promise that resolves to an array of message objects containing:
   *  - time: Timestamp in milliseconds
   *  - title: Message status
   *  - text: Formatted message text
   *  - tags: Optional array of message tags
   * 
   * @throws Error if message retrieval fails
   * 
   * @remarks
   * - Filters out messages outside the specified time range
   * - Converts PRTG datetime format to Unix timestamp
   * - Validates message data before processing
   * - Formats message text using internal formatter
   * - Handles comma-separated tags
   */
  async getMessages(
    fromTime: number,
    toTime: number,
    sensorId: number
  ): Promise<Array<{ time: number; title: string; text: string; tags?: string[] }>> {
    const params = new URLSearchParams({
      content: 'messages',
      columns: 'objid,datetime,parent,type,name,status,message,tags',
      id: sensorId.toString(),
    }).toString();

    return lastValueFrom(
      from(this.executeRequest<PRTGMessage[]>('table.json', params)).pipe(
        map((messages) => {
          if (!Array.isArray(messages)) {
            return [];
          }

          return _(messages)
            .map((message) => {
              const timestamp: number = Math.round((message.datetime_raw - 25569) * 86400);

              const fromTimestamp = Number(fromTime);
              const toTimestamp = Number(toTime);

              if (
                isNaN(timestamp) ||
                isNaN(fromTimestamp) ||
                isNaN(toTimestamp) ||
                !message.parent ||
                !message.type ||
                !message.message
              ) {
                return null;
              }

              if (timestamp <= fromTimestamp || timestamp >= toTimestamp) {
                return null;
              }

              return {
                time: timestamp * 1000,
                title: message.status,
                text: this.formatMessageText({
                  parent: message.parent,
                  type: message.type,
                  message: message.message,
                }),
                tags: message.tags ? _.map(message.tags.split(','), (t) => t.trim()) : [],
              };
            })
            .compact()
            .value();
        }),
        catchError((error) => {
          console.error('Failed to get messages:', error);
          throw new Error(`Message retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        })
      )
    );
  }

  /**
   * Formats a message object into an HTML paragraph string
   * @param message - The message object containing parent, type, and message details
   * @param message.parent - The parent context of the message
   * @param message.type - The type of the message
   * @param message.message - The actual message content
   * @returns An HTML formatted string containing the message details or a default message if details are missing
   */
  private formatMessageText(message: { parent: string; type: string; message: string }): string {
    if (!message.parent || !message.type || !message.message) {
      return '<p>No message details available</p>';
    }
    return `<p>${message.parent} (${message.type}) Message:<br>${message.message}</p>`;
  }

  /**
   * Tests the authentication against the PRTG API by making a request to 'table.json' endpoint.
   * 
   * This method attempts to execute a request to verify if the authentication credentials are valid.
   * It handles various error cases and network failures gracefully.
   * 
   * @returns {Promise<boolean>} A promise that resolves to:
   *  - `true` if authentication is successful
   *  - `false` if authentication fails or an error occurs
   * 
   * @throws {Error} When no response is received from PRTG
   * 
   * @example
   * ```typescript
   * const api = new PRTGApi();
   * const isAuthenticated = await api.testAuth();
   * if (isAuthenticated) {
   *   console.log('Successfully authenticated');
   * }
   * ```
   */
  async testAuth(): Promise<boolean> {
    try {
      return lastValueFrom(
        from(this.executeRequest<PRTGResponse>('table.json')).pipe(
          map((response) => {
            if (!response) {
              throw new Error('No response received from PRTG');
            }
            return true;
          }),
          catchError((error) => {
            console.error('Failed to test authentication:', error);
            return from([false]);
          })
        )
      );
    } catch (error) {
      console.error('Authentication test failed:', error);
      return false;
    }
  }

  /**
   * Retrieves information about a specific PRTG group by its name.
   * 
   * @param groupName - The name of the group to retrieve information for
   * @returns Promise resolving to a PRTGGroup object containing the group information
   * @throws Error if the group is not found or if the retrieval operation fails
   * 
   * @example
   * ```typescript
   * try {
   *   const groupInfo = await api.getGroupInfo("MyGroup");
   *   console.log(groupInfo);
   * } catch (error) {
   *   console.error(error);
   * }
   * ```
   */
  async getGroupInfo(groupName: string): Promise<PRTGGroup> {
    try {
      const groups = await this.performGroupSuggestQuery();
      const group = groups.find((g) => g.group === groupName);
      if (!group) {
        throw new Error(`Group not found: ${groupName}`);
      }
      return group;
    } catch (error) {
      console.error('Failed to get group info:', error);
      throw new Error(`Group info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves information for a specific device by its name.
   * 
   * @param deviceName - The name of the device to retrieve information for
   * @returns Promise that resolves to a PRTGDevice object containing the device information
   * @throws Error if the device is not found or if the device info retrieval fails
   * 
   * @example
   * try {
   *   const deviceInfo = await api.getDeviceInfo("MyDevice");
   *   console.log(deviceInfo);
   * } catch (error) {
   *   console.error("Error:", error.message);
   * }
   */
  async getDeviceInfo(deviceName: string): Promise<PRTGDevice> {
    try {
      const devices = await this.performDeviceSuggestQuery();
      const device = devices.find((d) => d.device === deviceName);
      if (!device) {
        throw new Error(`Device not found: ${deviceName}`);
      }
      return device;
    } catch (error) {
      console.error('Failed to get device info:', error);
      throw new Error(`Device info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Retrieves information for a specific sensor by its name.
   * 
   * @param sensorName - The name of the sensor to retrieve information for
   * @returns A Promise that resolves to a PRTGSensor object containing the sensor information
   * @throws {Error} When the sensor is not found or if the sensor information retrieval fails
   * 
   * @example
   * ```typescript
   * try {
   *   const sensorInfo = await api.getSensorInfo("My Sensor");
   *   console.log(sensorInfo);
   * } catch (error) {
   *   console.error(error);
   * }
   * ```
   */
  async getSensorInfo(sensorName: string): Promise<PRTGSensor> {
    try {
      const sensors = await this.performSensorSuggestQuery();
      const sensor = sensors.find((s) => s.sensor === sensorName);
      if (!sensor) {
        throw new Error(`Sensor not found: ${sensorName}`);
      }
      return sensor;
    } catch (error) {
      console.error('Failed to get sensor info:', error);
      throw new Error(`Sensor info retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
