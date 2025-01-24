import { PRTGDataSource } from '../datasource';
import { LoadingState, DataQueryRequest, dateTime, PluginType } from '@grafana/data';
import { PRTGQuery, PRTGAnnotationQuery } from '../types';
import { PRTGDataSourceSettings } from '../types/interface.datasource';
import { PRTGApi } from '../Api';

jest.mock('./Api');
jest.mock('@grafana/runtime', () => ({
    getTemplateSrv: () => ({
        replace: jest.fn((str) => str),
    }),
}));

describe('PRTGDataSource', () => {
    let ds: PRTGDataSource;
    let mockApi: jest.Mocked<PRTGApi>;

    const defaultSettings: PRTGDataSourceSettings = {
        id: 1,
        uid: 'test',
        type: 'prtg-grafana-datasource',
        name: 'PRTG',
        meta: {
            id: 'prtg-grafana-datasource',
            name: 'PRTG',
            type: PluginType.datasource,
            info: {
                description: 'PRTG datasource',
                author: { name: 'Test' },
                logos: { small: '', large: '' },
                links: [],
                screenshots: [],
                updated: '',
                version: ''
            },
            module: '',
            baseUrl: ''
        },
        readOnly: false,
        access: 'proxy' as 'proxy',
        jsonData: {
            hostname: 'prtg.example.com',
            username: 'admin',
            passhash: 'hashedpassword',
            timeout: 30000,
            cacheTimeout: 300,
            tzAutoAdjust: false
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        ds = new PRTGDataSource(defaultSettings);
        mockApi = ds.api as jest.Mocked<PRTGApi>;
    });

    describe('Constructor', () => {
        it('should initialize with correct default values', () => {
            expect(ds.baseUrl).toBe('https://prtg.example.com/api/');
            expect(ds.username).toBe('admin');
            expect(ds.passhash).toBe('hashedpassword');
        });

        it('should handle missing jsonData values', () => {
            const dsWithEmptySettings = new PRTGDataSource({
                ...defaultSettings,
                jsonData: {}
            });
            expect(dsWithEmptySettings.username).toBe('');
            expect(dsWithEmptySettings.passhash).toBe('');
        });
    });

    describe('parseTimeout', () => {
        it('should parse string timeout values', () => {
            expect(ds['parseTimeout']('300', 1000)).toBe(300);
        });

        it('should handle numeric timeout values', () => {
            expect(ds['parseTimeout'](500, 1000)).toBe(500);
        });

        it('should return default value for invalid input', () => {
            expect(ds['parseTimeout']('invalid', 1000)).toBe(1000);
            expect(ds['parseTimeout'](undefined, 1000)).toBe(1000);
        });
    });

    describe('parsePRTGDateTime', () => {
        it('should parse full datetime string correctly', () => {
            const result = ds['parsePRTGDateTime']('24.12.2023 15:30:45');
            expect(result).toBe(new Date(2023, 11, 24, 15, 30, 45).getTime());
        });

        it('should parse date-only string with default time', () => {
            const result = ds['parsePRTGDateTime']('24.12.2023');
            expect(result).toBe(new Date(2023, 11, 24, 0, 0, 0).getTime());
        });
    });

    describe('testDatasource', () => {
        it('should return success when connection test passes', async () => {
            mockApi.getVersion.mockResolvedValue('23.1.82.1980');
            mockApi.testAuth.mockResolvedValue(true);

            const result = await ds.testDatasource();
            expect(result.status).toBe('success');
            expect(result.message).toContain('Successfully connected to PRTG');
        });

        it('should return error when authentication fails', async () => {
            mockApi.getVersion.mockResolvedValue('23.1.82.1980');
            mockApi.testAuth.mockResolvedValue(false);

            const result = await ds.testDatasource();
            expect(result.status).toBe('error');
            expect(result.message).toBe('Authentication failed');
        });

        it('should handle connection errors', async () => {
            mockApi.getVersion.mockRejectedValue(new Error('Connection refused'));

            const result = await ds.testDatasource();
            expect(result.status).toBe('error');
            expect(result.message).toBe('Connection failed');
        });
    });

    describe('query', () => {
        const defaultQuery: DataQueryRequest<PRTGQuery> = {
            requestId: '1',
            targets: [],
            range: {
                from: dateTime(1609459200000), // 2021-01-01
                to: dateTime(1609545600000),    // 2021-01-02
                raw: {
                    from: '2021-01-01',
                    to: '2021-01-02'
                }
            },
            interval: '1h',
            intervalMs: 3600000,
            timezone: 'UTC',
            app: 'dashboard',
            startTime: 0,
            scopedVars: {},
        };

        it('should handle empty query targets', async () => {
            const result = await ds.query(defaultQuery);
            expect(result.data).toHaveLength(0);
            expect(result.state).toBe(LoadingState.Error);
        });

        it('should handle text query type', async () => {
            const query = {
                ...defaultQuery,
                targets: [{
                    refId: 'A',
                    queryType: 'text' as 'metrics' | 'raw' | 'text',
                    propertySelection: { name: 'sensor' },
                    sensorSelection: { name: 'test-sensor' },
                    filterPropertySelection: { name: 'status' },
                    groupSelection: { name: '' },
                    deviceSelection: { name: '' },
                    channelSelection: { name: '' },
                    rawRequest: { endpoint: '', parameters: '' },
                    transformations: [],
                    options: {
                        mode: {
                            name: 'default',
                            value: 'default',
                            filterProperty: {},
                            valueSource: {},
                            valueProperty: {}
                        },
                        includeGroupName: false,
                        includeSensorName: true,
                        includeDeviceName: false,
                        filterPropertyName: {
                            name: '',
                            visible_name: ''
                        },
                        propertyName: {
                            name: '',
                            visible_name: ''
                        },
                        target: ''
                    },
                    queryOptions: {
                        displayMode: {
                            name: 'default',
                            value: 'default',
                            filterProperty: {},
                            valueSource: {},
                            valueProperty: {}
                        },
                        includeSensorName: true,
                        includeDeviceName: false,
                        includeGroupName: false,
                        target: ''
                    }
                }]
            };
            mockApi.getSensorInfo.mockResolvedValue({
                datetime: '01.01.2021 00:00:00',
                status: 'Up',
                status_raw: 3,
                message: '',
                group: 'TestGroup',
                device: 'TestDevice',
                sensor: 'TestSensor',
                objid: 123,
                channel: '',
                active: true,
                tags: '',
                priority: '3'
            });

            const result = await ds.query(query);
            expect(result.data).toHaveLength(1);
            expect(result.state).toBe(LoadingState.Done);
        });
    });

    describe('annotations', () => {
        it('should prepare annotation query correctly', () => {
            const anno: PRTGAnnotationQuery = {
                enable: true,
                name: 'Test Annotation',
                iconColor: '#ff0000',
                annotation: {
                    sensorId: '1234',
                    name: 'Test Annotation',
                    enable: true
                },
                range: {
                    from: new Date(1609459200000),
                    to: new Date(1609545600000),
                    raw: {
                        from: '2021-01-01',
                        to: '2021-01-02'
                    }
                },
                rangeRaw: {
                    from: '2021-01-01',
                    to: '2021-01-02'
                },
                dashboard: {},
                panelId: 1
            };

            const query = ds.annotations?.prepareQuery?.(anno);
            expect(query).toBeDefined();
            expect(query?.sensorSelection?.name).toBe('1234');
            expect(query?.queryType).toBe('metrics');
        });

        it('should return undefined for annotation without sensorId', () => {
            const anno: PRTGAnnotationQuery = {
                enable: true,
                name: 'Test Annotation',
                iconColor: '#ff0000',
                annotation: {
                    name: 'Test Annotation',
                    enable: true
                },
                range: {
                    from: new Date(),
                    to: new Date(),
                    raw: { from: '', to: '' }
                },
                rangeRaw: { from: '', to: '' },
                dashboard: {},
                panelId: 1
            };

            const query = ds.annotations?.prepareQuery?.(anno);
            expect(query).toBeUndefined();
        });
    });
});
