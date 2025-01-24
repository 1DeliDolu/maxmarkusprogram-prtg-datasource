import { PRTGApi } from '../Api';
import axios from 'axios';
import { PRTGError } from '../services/PRTGError';
import { PRTGGroup, PRTGDevice, PRTGQueryItem } from '../types/interfaces';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PRTGApi', () => {
    let api: PRTGApi;
    
    beforeEach(() => {
        api = new PRTGApi({
            baseUrl: 'https://prtg.example/api/',
            username: 'testuser',
            passwordHash: 'testhash',
            cacheTimeout: 300,
            enableTimeZoneAdjust: false
        });
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with config', () => {
            expect(api.baseUrl).toBe('https://prtg.example/api/');
            expect(api.username).toBe('testuser');
            expect(api.passwordHash).toBe('testhash');
            expect(api.cacheTimeout).toBe(300);
            expect(api.enableTimeZoneAdjust).toBe(false);
        });
    });

    describe('getVersion', () => {
        it('should return version from Version field', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { Version: '1.2.3' }
            });
            
            const version = await api.getVersion();
            expect(version).toBe('1.2.3');
        });

        it('should return version from prtg-version field', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { 'prtg-version': '1.2.3' }
            });

            const version = await api.getVersion();
            expect(version).toBe('1.2.3');
        });

        it('should return Unknown Version when no version found', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {}
            });

            const version = await api.getVersion();
            expect(version).toBe('Unknown Version');
        });

        it('should handle errors', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

            const version = await api.getVersion();
            expect(version).toMatch(/^ERROR:/);
        });
    });

    describe('testAuth', () => {
        it('should return true on successful auth', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { 'prtg-version': '1.2.3' }
            });

            const result = await api.testAuth();
            expect(result).toBe(true);
        });

        it('should return false on auth failure', async () => {
            mockedAxios.get.mockRejectedValueOnce(new PRTGError('Auth failed'));

            const result = await api.testAuth();
            expect(result).toBe(false);
        });
    });

    describe('performGroupSuggestQuery', () => {
        it('should return sorted groups', async () => {
            const mockGroups: PRTGGroup[] = [
                { 
                    group: 'Group A', 
                    objid: 0,
                    device: '',
                    sensor: '',
                    channel: '',
                    active: true,
                    status: 'ok',
                    status_raw: 3,
                    type: 'group',
                    tags: '',
                    message: '',
                    priority: '3',
                    datetime: ''
                },
                { 
                    group: 'Group B', 
                    objid: 1,
                    device: '',
                    sensor: '',
                    channel: '',
                    active: true,
                    status: 'ok',
                    status_raw: 3,
                    type: 'group',
                    tags: '',
                    message: '',
                    priority: '3',
                    datetime: ''
                }
            ];

            mockedAxios.get.mockResolvedValueOnce({
                data: { groups: mockGroups }
            });

            const groups = await api.performGroupSuggestQuery();
            expect(groups[0].group).toBe('Group A');
            expect(groups[1].group).toBe('Group B');
        });

        it('should handle errors', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

            await expect(api.performGroupSuggestQuery()).rejects.toThrow('Group query failed');
        });
    });

    describe('performDeviceSuggestQuery', () => {
        it('should return sorted devices', async () => {
            const mockDevices: PRTGDevice[] = [
                {
                    device: 'Device B',
                    objid: 1,
                    group: '',
                    sensor: '',
                    channel: '',
                    active: true,
                    tags: '',
                    status: 'ok',
                    status_raw: 3,
                    message: '',
                    priority: '3',
                    datetime: ''
                },
                {
                    device: 'Device A',
                    objid: 2,
                    group: '',
                    sensor: '',
                    channel: '',
                    active: true,
                    tags: '',
                    status: 'ok',
                    status_raw: 3,
                    message: '',
                    priority: '3',
                    datetime: ''
                }
            ];

            mockedAxios.get.mockResolvedValueOnce({
                data: { devices: mockDevices }
            });

            const devices = await api.performDeviceSuggestQuery();
            expect(devices[0].device).toBe('Device A');
            expect(devices[1].device).toBe('Device B');
        });

        it('should apply group filter', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { devices: [] }
            });

            await api.performDeviceSuggestQuery('TestGroup');
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('filter_group=TestGroup'),
                expect.any(Object)
            );
        });
    });

    describe('performQuerySuggestQuery', () => {
        it('should handle historical data query', async () => {
            const mockQueries: PRTGQueryItem[] = [{
                sensorId: 123,
                channelId: '456'
            }];

            mockedAxios.get.mockResolvedValueOnce({
                data: { histdata: [{value: 1}] }
            });

            const result = await api.performQuerySuggestQuery(
                Date.now() - 3600000,  // 1 hour ago
                Date.now(),
                mockQueries
            );

            expect(result).toHaveProperty('histdata');
        });

        it('should throw error for invalid sensor ID', async () => {
            const mockQueries: PRTGQueryItem[] = [{
                sensorId: -1,  // Changed from 'invalid' to a number
                channelId: '456'
            }];

            await expect(api.performQuerySuggestQuery(
                Date.now(),
                Date.now(),
                mockQueries
            )).rejects.toThrow('Invalid sensor ID');
        });
    });
});