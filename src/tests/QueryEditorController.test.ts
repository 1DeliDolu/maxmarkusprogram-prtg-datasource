import { QueryEditorController } from '../QueryEditorController';
import { PRTGDataSource } from '../datasource';
import { TemplateSrv } from '@grafana/runtime';
import { PRTGQuery, PRTGEditorMode } from '../types';
import { PRTGGroup } from '../types/interfaces';

// Mock dependencies
jest.mock('./datasource');
jest.mock('@grafana/runtime');

describe('QueryEditorController', () => {
    let controller: QueryEditorController;
    let mockTarget: PRTGQuery;
    let mockDatasource: jest.Mocked<PRTGDataSource>;
    let mockTemplateSrv: jest.Mocked<TemplateSrv>;
    let mockPanelCtrl: any;

    beforeEach(() => {
        mockTarget = {
            refId: 'A',
            queryType: 'metrics',
            groupSelection: { name: '' },
            deviceSelection: { name: '' },
            sensorSelection: { name: '' },
            channelSelection: { name: '' },
            valueSelection: { name: '' },
            propertySelection: { name: '' },
            options: {
                mode: { name: 'Metrics', value: 'metrics', filterProperty: {}, valueSource: {}, valueProperty: {} },
                includeSensorName: false,
                includeDeviceName: false,
                includeGroupName: false,
                propertyName: { name: '', visible_name: '' },
                filterPropertyName: { name: '', visible_name: '' },
                target: '*'
            }
        } as PRTGQuery;

        // Fix the API mock typing
        mockDatasource = {
            api: {
                performGroupSuggestQuery: jest.fn().mockResolvedValue([]) as jest.MockedFunction<() => Promise<PRTGGroup[]>>,
                performDeviceSuggestQuery: jest.fn().mockResolvedValue([]),
                performSensorSuggestQuery: jest.fn().mockResolvedValue([]),
                performChannelSuggestQuery: jest.fn().mockResolvedValue([]),
                performValueSuggestQuery: jest.fn().mockResolvedValue([])
            }
        } as unknown as jest.Mocked<PRTGDataSource>;

        mockTemplateSrv = {
            replace: jest.fn(),
            getVariables: jest.fn().mockReturnValue([])
        } as unknown as jest.Mocked<TemplateSrv>;

        mockPanelCtrl = {
            refresh: jest.fn()
        };

        controller = new QueryEditorController(mockTarget, mockDatasource, mockTemplateSrv, mockPanelCtrl);
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(controller.getTarget()).toBeDefined();
            expect(controller.getTarget().queryType).toBe('metrics');
        });
    });

    describe('switchEditorMode', () => {
        it('should switch editor mode and trigger target change', () => {
            const newMode: PRTGEditorMode = {
                name: 'Text',
                value: 'text',
                filterProperty: {},
                valueSource: {},
                valueProperty: {}
            };
            controller.switchEditorMode(newMode);
            expect(controller.getTarget().options?.mode.value).toBe('text');
        });
    });

    describe('targetChange', () => {
        it('should trigger panel refresh when target changes', () => {
            controller.targetChange();
            expect(mockPanelCtrl.refresh).toHaveBeenCalled();
        });
    });

    describe('clearSelection', () => {
        it('should clear group selection and dependent lists', () => {
            controller.clearSelection('group');
            const target = controller.getTarget();
            expect(target.groupSelection?.name).toBe('');
        });
    });

    describe('updateTarget', () => {
        it('should update target with new properties', () => {
            const newProperties = {
                queryType: 'text' as 'metrics' | 'raw' | 'text',
                groupSelection: { name: 'testGroup' }
            };
            controller.updateTarget(newProperties);
            const target = controller.getTarget();
            expect(target.queryType).toBe('text');
            expect(target.groupSelection?.name).toBe('testGroup');
        });
    });

    describe('validation', () => {
        it('should validate target and return errors for missing required fields', () => {
            const validationStatus = controller.getValidationStatus();
            expect(validationStatus.isValid).toBe(false);
            expect(validationStatus.errors.length).toBeGreaterThan(0);
        });
    });

    describe('list updates', () => {
        beforeEach(() => {
            (mockDatasource.api.performGroupSuggestQuery as jest.MockedFunction<() => Promise<PRTGGroup[]>>)
                .mockResolvedValue([
                    { group: 'Group1' } as PRTGGroup,
                    { group: 'Group2' } as PRTGGroup
                ]);
        });

        it('should update group list', async () => {
            await controller.updateGroupList();
            const groups = controller.getGroupNames();
            expect(groups).toContain('*');
            expect(mockDatasource.api.performGroupSuggestQuery).toHaveBeenCalled();
        });

        it('should handle errors during list updates', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (mockDatasource.api.performGroupSuggestQuery as jest.Mock).mockRejectedValue(new Error('API Error'));
            
            await controller.updateGroupList();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('template variables', () => {
        it('should handle template variable changes', () => {
            const mockTarget = controller.getTarget();
            mockTarget.groupSelection = { name: '$variable' };
            controller.variableChanged();
            expect(mockPanelCtrl.refresh).toHaveBeenCalled();
        });
    });

    describe('disposal', () => {
        it('should clear metric lists on dispose', () => {
            controller.dispose();
            const groups = controller.getGroupNames();
            expect(groups).toHaveLength(0);
        });
    });

    describe('selection handling', () => {
        it('should handle group selection', () => {
            controller.selectGroup();
            expect(mockPanelCtrl.refresh).toHaveBeenCalled();
        });

        it('should handle device selection', () => {
            controller.selectDevice();
            expect(mockPanelCtrl.refresh).toHaveBeenCalled();
        });

        it('should handle sensor selection', () => {
            controller.selectSensor();
            expect(mockPanelCtrl.refresh).toHaveBeenCalled();
        });
    });

    describe('reset functionality', () => {
        it('should reset target to default state', () => {
            controller.resetTarget();
            const target = controller.getTarget();
            expect(target.groupSelection?.name).toBe('');
            expect(target.deviceSelection?.name).toBe('');
            expect(target.sensorSelection?.name).toBe('');
        });    });
});