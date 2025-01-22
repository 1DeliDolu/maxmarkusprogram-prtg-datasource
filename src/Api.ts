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

  private handleRequestError(error: any): void {
    console.error('PRTG API Request failed:', error);
    if (axios.isAxiosError(error)) {
      throw PRTGError.fromAxiosError(error);
    }
    throw new PRTGError(error.message || 'Unknown error');
  }

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

  private formatMessageText(message: { parent: string; type: string; message: string }): string {
    if (!message.parent || !message.type || !message.message) {
      return '<p>No message details available</p>';
    }
    return `<p>${message.parent} (${message.type}) Message:<br>${message.message}</p>`;
  }

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
