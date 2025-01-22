import { cloneDeep } from 'lodash';
import { PRTGQuery, IScopeDefaults, PRTGEditorMode } from './types';
import { isRegex, isNumeric, isTemplateVariable } from './utils';
import { PRTGDataSource } from './datasource';
import { PRTGError } from './services/PRTGError';
import { TemplateSrv } from '@grafana/runtime';
import { SelectableValue } from '@grafana/data';

export class QueryEditorController {
    private target: PRTGQuery;
    private datasource: PRTGDataSource;
    private templateSrv: TemplateSrv;
    private oldTarget!: PRTGQuery;
    private targetLetters: string;
    private panelCtrl: any;

    private queryTypeOptions: { [key: string]: PRTGEditorMode } = {
        1: { name: 'Metrics', value: 'metrics', filterProperty: {}, valueSource: {}, valueProperty: {} },
        2: { name: 'Text', value: 'text', filterProperty: {}, valueSource: {}, valueProperty: {} },
        3: { name: 'Raw', value: 'raw', filterProperty: {}, valueSource: {}, valueProperty: {} },
    };

    private metric: {
        groupList: Array<{ name: string; visible_name?: string; templated?: boolean }>;
        deviceList: Array<{ name: string; visible_name?: string; templated?: boolean }>;
        sensorList: Array<{ name: string; visible_name?: string; templated?: boolean }>;
        channelList: Array<{ name: string; visible_name?: string; templated?: boolean }>;
        valueList: Array<{ name: string; visible_name?: string; templated?: boolean }>;
        propertyList: Array<{ name: string; visible_name: string; templated?: boolean }>;
        filterPropertyList?: Array<{ name: string; visible_name: string; templated?: boolean }>;
    };

    private scopeDefaults: IScopeDefaults = {
        metric: {
            filterPropertyList: [
                { name: 'active', visible_name: 'Active' },
                { name: 'message_raw', visible_name: 'Message' },
                { name: 'priority', visible_name: 'Priority' },
                { name: 'status', visible_name: 'Status' },
                { name: 'tags', visible_name: 'Tags' },
            ],
            propertyList: [
                { name: 'group', visible_name: 'Group' },
                { name: 'device', visible_name: 'Device' },
                { name: 'sensor', visible_name: 'Sensor' },
            ],
        },
    };

    constructor(target: PRTGQuery, datasource: PRTGDataSource, templateSrv: TemplateSrv, panelCtrl: any) {
        this.target = target;
        this.datasource = datasource;
        this.templateSrv = templateSrv;
        this.targetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.panelCtrl = panelCtrl; // Initialize panel controller
        this.metric = {
            groupList: [],
            deviceList: [],
            sensorList: [],
            channelList: [],
            valueList: [],
            propertyList: [],
            filterPropertyList: [],
        };
        this.init();
    }

    private init(): void {
        const target = this.target;
        this.templateSrv = this.templateSrv;
        this.targetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        const scopeDefaults = {
            metric: {
                filterPropertyList: [
                    { name: 'active', visible_name: 'Active' },
                    { name: 'message_raw', visible_name: 'Message' },
                    { name: 'priority', visible_name: 'Priority' },
                    { name: 'status', visible_name: 'Status' },
                    { name: 'tags', visible_name: 'Tags' },
                ],
                propertyList: [
                    { name: 'group', visible_name: 'Group' },
                    { name: 'device', visible_name: 'Device' },
                    { name: 'sensor', visible_name: 'Sensor' },
                ],
            },
            oldTarget: cloneDeep(this.target),
        };

        Object.assign(this, scopeDefaults);

        const targetDefaults = {
            group: { name: '' },
            device: { name: '' },
            sensor: { name: '' },
            channel: { name: '' },
            value: { name: '' },
            raw: { uri: '', queryString: '' },
            functions: [],
            options: {
                mode: this.queryTypeOptions[1],
                includeGroupName: false,
                includeSensorName: false,
                includeDeviceName: false,
                filterPropertyName: { name: '', visible_name: '' },
                propertyName: { name: '', visible_name: '' },
                target: '*',  // Add required target property
                deviceName: { name: '', visible_name: '' },
                sensorName: { name: '', visible_name: '' },
                groupName: { name: '', visible_name: '' },
                invertChannelFilter: false
            },
            queryOptions: {
                displayMode: this.queryTypeOptions[1],
                includeSensorName: false,
                includeDeviceName: false,
                includeGroupName: false,
                filterPropertyName: { name: '', visible_name: '' },
                propertyName: { name: '', visible_name: '' },
                target: '*',  // Add required target property
                textProperty: { name: '', visible_name: '' }
            }
        };

        Object.assign(target, targetDefaults);
        this.updateGroupList();
        this.updateDeviceList();
        this.updateSensorList();
        this.updateChannelList();
        this.updateValueList();
        this.updatePropertyList();
        this.updateFilterPropertyList();

        this.target.validationErrors = this.validateTarget();

        this.getGroupNames = () => this.getMetricNames('groupList') || [];
        this.getDeviceNames = () => this.getMetricNames('deviceList') || [];
        this.getSensorNames = () => this.getMetricNames('sensorList') || [];
        this.getChannelNames = () => this.getMetricNames('channelList') || [];
        this.getValueNames = () => this.getMetricNames('valueList') || [];
        this.getPropertyName = () => this.getMetricNames('propertyList') || [];
        this.getFilterPropertyName = () => this.getMetricNames('filterPropertyList') || [];

        this.metric.propertyList = [...this.scopeDefaults.metric.propertyList];
        this.metric.filterPropertyList = [...this.scopeDefaults.metric.filterPropertyList];
    }

    public switchEditorMode(mode: PRTGEditorMode): void {
        if (!this.target.options) {
            this.target.options = {
                mode: mode,
                includeSensorName: false,
                includeDeviceName: false,
                includeGroupName: false,
                propertyName: { name: '', visible_name: '' },
                filterPropertyName: { name: '', visible_name: '' },
                target: '*'  // Add required target property
            };
        } else {
            this.target.options.mode = mode;
        }
        this.targetChange();
    }

    public targetChange(): void {
        const newTarget = cloneDeep(this.target);
        if (!this.isEqual(this.oldTarget, this.target)) {
            this.oldTarget = newTarget;
            if (this.panelCtrl?.refresh) {
                this.panelCtrl.refresh();
            }
        }
    }

    public variableChanged(): void {
        const items = [
            'groupSelection',
            'deviceSelection',
            'sensorSelection',
            'channelSelection',
            'valueSelection',
            'propertySelection',
            'filterPropertySelection',
        ] as const;
        items.some((item) => {
            const selection = this.target[item];
            // Add null checks
            if (selection && selection.name && selection.name.indexOf('$') > -1) {
                this.targetChange();
                return true;
            }
            return false;
        });
    }

    public selectGroup(): void {
        this.targetChange();
        this.updateDeviceList().catch((err) => console.error('Failed to update device list:', err));
    }

    public selectDevice(): void {
        this.targetChange();
        this.updateSensorList().catch((err) => console.error('Failed to update sensor list:', err));
    }

    public selectSensor(): void {
        this.targetChange();
        this.updateChannelList().catch((err) => console.error('Failed to update channel list:', err));
    }

    public selectChannel(): void {
        this.targetChange();
        this.updateValueList().catch((err) => console.error('Failed to update value list:', err));
    }
    public selectValue(): void {
        this.targetChange();
    }
    public selectProperty(): void {
        this.targetChange();
    }

    public selectFilterProperty(): void {
        this.targetChange();
    }

    private validateTarget(): string[] {
        const errors: string[] = [];

        if (!this.target) {
            throw new PRTGError('Target is not defined');
        }

        const {
            groupSelection,
            deviceSelection,
            sensorSelection,
            channelSelection,
            valueSelection,
            propertySelection,
            filterPropertySelection,
        } = this.target;

        if (!groupSelection?.name?.trim()) {
            errors.push('Group selection is required');
        }
        if (!deviceSelection?.name?.trim()) {
            errors.push('Device selection is required');
        }
        if (!sensorSelection?.name?.trim()) {
            errors.push('Sensor selection is required');
        }
        if (!channelSelection?.name?.trim()) {
            errors.push('Channel selection is required');
        }
        if (!valueSelection?.name?.trim()) {
            errors.push('Value selection is required');
        }
        if (!propertySelection?.name?.trim()) {
            errors.push('Property selection is required');
        }
        if (!filterPropertySelection) {
            this.target.validationErrors = undefined;
        }

        return errors;
    }

    private getMetricNames(metricType: keyof typeof this.metric): string[] | undefined {
        const list = this.metric[metricType];
        if (!Array.isArray(list)) {
            return undefined;
        }
        return [...new Set(list.map((item) => item.name))];
    }

    public isRegex = isRegex;
    public isNumeric = isNumeric;
    public isVariable = isTemplateVariable;

    public getGroupNames = (): string[] => this.getMetricNames('groupList') || [];
    public getDeviceNames = (): string[] => this.getMetricNames('deviceList') || [];
    public getSensorNames = (): string[] => this.getMetricNames('sensorList') || [];
    public getChannelNames = (): string[] => this.getMetricNames('channelList') || [];
    public getValueNames = (): string[] => this.getMetricNames('valueList') || [];
    public getPropertyName = (): string[] => this.getMetricNames('propertyList') || [];
    public getFilterPropertyName = (): string[] => this.getMetricNames('filterPropertyList') || [];

    public updateTarget(newTarget: Partial<PRTGQuery>): void {
        this.target = {
            ...this.target,
            ...newTarget,
        };
    }

    private addTemplatedVariables(metricList: Array<{ name: string; templated?: boolean }>): void {
        this.templateSrv.getVariables().forEach((variable) => {
            metricList.push({
                name: '$' + variable.name,
                templated: true,
            });
        });
    }

    private isEqual(oldTarget: PRTGQuery | null, newTarget: PRTGQuery | null): boolean {
        if (!oldTarget || !newTarget) {
            return false;
        }
        return JSON.stringify(oldTarget) === JSON.stringify(newTarget);
    }

    public getTarget(): PRTGQuery {
        return this.target;
    }

    public async updateGroupList(): Promise<void> {
        this.metric.groupList = [{ name: '*', visible_name: 'All' }];
        this.addTemplatedVariables(this.metric.groupList);
        try {
            const groups = await this.datasource.api.performGroupSuggestQuery();
            if (Array.isArray(groups)) {
                groups.forEach((group) => {
                    if (group?.group) {
                        this.metric.groupList.push({
                            name: group.group,
                            visible_name: group.group,
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update group list:', error);
        }
    }

    public async updateDeviceList(): Promise<void> {
        if (!this.target.groupSelection?.name) {
            return;
        }
        const groupFilter = this.templateSrv.replace(this.target.groupSelection.name);
        this.metric.deviceList = [{ name: '*', visible_name: 'All' }];
        this.addTemplatedVariables(this.metric.deviceList);

        try {
            const devices = await this.datasource.api.performDeviceSuggestQuery(groupFilter);
            if (Array.isArray(devices)) {
                devices.forEach((device) => {
                    const name = device?.device || device?.device;
                    if (name) {
                        this.metric.deviceList.push({
                            name: device.device,
                            visible_name: device.device,
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update device list:', error);
        }
    }

    public async updateSensorList(): Promise<void> {
        if (!this.target.deviceSelection?.name) {
            return;
        }
        const deviceFilter = this.templateSrv.replace(this.target.deviceSelection.name);
        this.metric.sensorList = [{ name: '*', visible_name: 'All' }];
        this.addTemplatedVariables(this.metric.sensorList);
        try {
            const sensors = await this.datasource.api.performSensorSuggestQuery(deviceFilter);
            if (Array.isArray(sensors)) {
                sensors.forEach((sensor) => {
                    if (sensor.sensor) {
                        this.metric.sensorList.push({
                            name: sensor.sensor,
                            visible_name: sensor.sensor,
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update sensor list:', error);
        }
    }

    public async updateChannelList(): Promise<void> {
        if (!this.target.sensorSelection?.name) {
            return;
        }
        const groupFilter = this.templateSrv.replace(this.target.groupSelection.name);
        const deviceFilter = this.templateSrv.replace(this.target.deviceSelection.name);
        const sensorFilter = this.templateSrv.replace(this.target.sensorSelection.name);

        this.metric.channelList = [{ name: '*', visible_name: 'All' }];
        this.addTemplatedVariables(this.metric.channelList);

        try {
            const channels = await this.datasource.api.performChannelSuggestQuery(groupFilter, deviceFilter, sensorFilter);

            if (Array.isArray(channels)) {
                channels.forEach((channel) => {
                    // Check all possible channel name properties
                    const channelName = channel.channel;
                    const channelText = channel.channel;
                    if (channelName) {
                        this.metric.channelList.push({
                            name: channelName.toString(),
                            visible_name: channelText?.toString() || channelName.toString(),
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update channel list:', error);
        }
    }

    public async updateValueList(): Promise<void> {
        if (!this.target.channelSelection?.name) {
            return;
        }
        const groupFilter = this.templateSrv.replace(this.target.groupSelection.name);
        const deviceFilter = this.templateSrv.replace(this.target.deviceSelection.name);
        const sensorFilter = this.templateSrv.replace(this.target.sensorSelection.name);
        const channelFilter = this.templateSrv.replace(this.target.channelSelection.name);

        // Initialize with "All" option
        this.metric.valueList = [{ name: '*', visible_name: 'All' }];
        this.addTemplatedVariables(this.metric.valueList);

        try {
            const values = await this.datasource.api.performValueSuggestQuery(
                groupFilter,
                deviceFilter,
                sensorFilter,
                channelFilter
            );

            if (Array.isArray(values) && values.length > 0) {
                const firstValue = values[0];
                Object.keys(firstValue).forEach((key) => {
                    if (key !== 'datetime') {
                        this.metric.valueList.push({
                            name: key,
                            visible_name: key,
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update value list:', error);
        }
    }

    updatePropertyList(): void {
        this.metric.propertyList = [...this.scopeDefaults.metric.propertyList];
    }
    updateFilterPropertyList(): void {
        this.metric.filterPropertyList = [...this.scopeDefaults.metric.filterPropertyList];
    }

    public getPropertyList(): Array<{ name: string; visible_name: string }> {
        return this.scopeDefaults.metric.propertyList;
    }

    public getQueryTypeOptions(): SelectableValue[] {
        return Object.values(this.queryTypeOptions).map((mode) => ({
            label: mode.name,
            value: mode.value,
            description: `${mode.name} Mode`,
        }));
    }

    public getMetricList(metricType: string): Array<{ name: string; visible_name?: string; templated?: boolean }> {
        switch (metricType) {
            case 'group':
                return this.metric.groupList || [];
            case 'device':
                return this.metric.deviceList || [];
            case 'sensor':
                return this.metric.sensorList || [];
            case 'channel':
                return this.metric.channelList || [];
            case 'value':
                return this.metric.valueList || [];
            case 'propertyList':
                return this.scopeDefaults.metric.propertyList || [];
            case 'filterPropertyList':
                return this.scopeDefaults.metric.filterPropertyList || [];
            default:
                return [];
        }
    }

    public clearSelection(selectionType: string): void {
        switch (selectionType) {
            case 'group':
                this.target.groupSelection = { name: '' };
                this.metric.deviceList = [];
                this.metric.sensorList = [];
                this.metric.channelList = [];
                this.metric.valueList = [];
                this.metric.propertyList = [];
                this.metric.filterPropertyList = [];
                break;
            case 'device':
                this.target.deviceSelection = { name: '' };
                this.metric.sensorList = [];
                this.metric.channelList = [];
                this.metric.valueList = [];
                this.metric.propertyList = [];
                this.metric.filterPropertyList = [];
                break;
            case 'sensor':
                this.target.sensorSelection = { name: '' };
                this.metric.channelList = [];
                this.metric.valueList = [];
                this.metric.propertyList = [];
                this.metric.filterPropertyList = [];
                break;
            case 'channel':
                this.target.channelSelection = { name: '' };
                this.metric.valueList = [];
            case 'value':
                this.target.valueSelection = { name: '' };
                break;
            case 'property':
                this.target.propertySelection = { name: '' };
                this.metric.filterPropertyList = [];
                break;
        }
        this.targetChange();
    }

    public async refreshSelectionLists(): Promise<void> {
        await this.updateGroupList();
        if (this.target.groupSelection?.name) {
            await this.updateDeviceList();
            if (this.target.deviceSelection?.name) {
                await this.updateSensorList();
                await this.updatePropertyList();
                if (this.target.sensorSelection?.name) {
                    await this.updateChannelList();
                    if (this.target.channelSelection?.name) {
                        await this.updateValueList();
                        if (this.target.valueSelection?.name) {
                            this.targetChange();
                        }
                    }
                }
            }
        }
    }

    public getValidationStatus(): { isValid: boolean; errors: string[] } {
        const errors = this.validateTarget();
        return {
            isValid: errors.length === 0,
            errors: errors,
        };
    }

    public resetTarget(): void {
        this.target = {
            refId: this.getNextRefId(),
            queryType: 'metrics',
            groupSelection: { name: '' },
            deviceSelection: { name: '' },
            sensorSelection: { name: '' },
            channelSelection: { name: '' },
            valueSelection: { name: '' },
            propertySelection: { name: '' },
            filterPropertySelection: { name: '' },
            rawRequest: {
                endpoint: '',
                parameters: '',
            },
            transformations: [],
            options: {
                mode: this.queryTypeOptions[1],
                includeSensorName: false,
                includeDeviceName: false,
                includeGroupName: false,
                propertyName: { name: '', visible_name: '' },
                filterPropertyName: { name: '', visible_name: '' },
                target: '*',  // Add default target
                deviceName: { name: '', visible_name: '' },
                sensorName: { name: '', visible_name: '' },
                groupName: { name: '', visible_name: '' }
            },
            queryOptions: {
                displayMode: this.queryTypeOptions[1],
                includeSensorName: false,
                includeDeviceName: false,
                includeGroupName: false,
                filterPropertyName: { name: '', visible_name: '' },
                propertyName: { name: '', visible_name: '' },
                target: '*',  // Add default target
                textProperty: { name: '', visible_name: '' }
            }
        };
        this.targetChange();
    }

    public applyTemplateVariables(selection: string): string {
        return this.templateSrv.replace(selection, {}, 'regex');
    }

    public dispose(): void {
        this.metric = {
            groupList: [],
            deviceList: [],
            sensorList: [],
            channelList: [],
            valueList: [],
            propertyList: [],
            filterPropertyList: [],
        };
    }

    private getNextRefId(): string {
        const letters = this.targetLetters.split('');
        const currentRefId = this.target?.refId || 'A';
        const index = Math.max(0, letters.indexOf(currentRefId));
        return letters[index] || 'A';
    }
}
