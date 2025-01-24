/**
 * Controller class for managing PRTG query editor functionality in a data source plugin.
 * Handles query building, validation, and UI interactions for PRTG metrics queries.
 * 
 * @class QueryEditorController
 * 
 * @property {PRTGQuery} target - The current query target being edited
 * @property {PRTGDataSource} datasource - The PRTG data source instance
 * @property {TemplateSrv} templateSrv - Service for handling template variables
 * @property {PRTGQuery} oldTarget - Previous state of the query target for change detection
 * @property {string} targetLetters - Available letters for query reference IDs
 * @property {any} panelCtrl - Panel controller reference
 * 
 * @description
 * This controller manages the hierarchical selection of PRTG components:
 * - Groups
 * - Devices
 * - Sensors
 * - Channels
 * - Values
 * - Properties
 * 
 * It provides functionality for:
 * - Updating selection lists based on hierarchy
 * - Managing query modes (Metrics, Text, Raw)
 * - Handling template variables
 * - Validating query configurations
 * - Managing query target changes
 * - Maintaining selection state
 * 
 * The controller supports three query modes:
 * 1. Metrics - For standard metric queries
 * 2. Text - For text-based queries
 * 3. Raw - For raw API queries
 * 
 * @example
 * ```typescript
 * const controller = new QueryEditorController(target, datasource, templateSrv, panelCtrl);
 * await controller.updateGroupList();
 * controller.selectGroup();
 * ```
 * 
 * @since 1.0.0
 */

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

    /**
     * @constructor
     * @param {PRTGQuery} target - The current query target being edited
     * @param {PRTGDataSource} datasource - The PRTG data source instance
     * @param {TemplateSrv} templateSrv - Service for handling template variables
     * @param {any} panelCtrl - Panel controller reference
     * @since 1.0.0
     */
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

    /**
     * @private
     * @description Initializes the controller with default settings and configurations
     * @returns {void}
     */
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
                target: '*',  
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


    /**
     * Switches the editor mode for the PRTG query editor.
     * Initializes default options if they don't exist, or updates the mode if options are already present.
     * 
     * @param mode - The PRTG editor mode to switch to
     * @remarks If target options don't exist, it creates a new options object with default values
     * @fires targetChange - Triggers target change event after mode switch
     */
    public switchEditorMode(mode: PRTGEditorMode): void {
        if (!this.target.options) {
            this.target.options = {
                mode: mode,
                includeSensorName: false,
                includeDeviceName: false,
                includeGroupName: false,
                propertyName: { name: '', visible_name: '' },
                filterPropertyName: { name: '', visible_name: '' },
                target: '*'  
            };
        } else {
            this.target.options.mode = mode;
        }
        this.targetChange();
    }

    /**
     * Handles changes in the target configuration.
     * Creates a deep clone of the current target and compares it with the old target.
     * If they are different, updates the old target reference and triggers a panel refresh.
     * 
     * @remarks
     * Uses lodash's cloneDeep for deep cloning of the target object.
     * Only refreshes the panel if panelCtrl exists and has a refresh method.
     */
    public targetChange(): void {
        const newTarget = cloneDeep(this.target);
        if (!this.isEqual(this.oldTarget, this.target)) {
            this.oldTarget = newTarget;
            if (this.panelCtrl?.refresh) {
                this.panelCtrl.refresh();
            }
        }
    }


    /**
     * Handles changes in the target configuration.
     * Creates a deep clone of the current target and compares it with the old target.
     * If they are different, updates the old target reference and triggers a panel refresh.
     * 
     * @remarks
     * Uses lodash's cloneDeep for deep cloning of the target object.
     * Only refreshes the panel if panelCtrl exists and has a refresh method.
     */
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
            if (selection && selection.name && selection.name.indexOf('$') > -1) {
                this.targetChange();
                return true;
            }
            return false;
        });
    }

    /**
     * Handles changes in the target configuration.
     * Creates a deep clone of the current target and compares it with the old target.
     * If they are different, updates the old target reference and triggers a panel refresh.
     */
    public selectGroup(): void {
        this.targetChange();
        this.updateDeviceList().catch((err) => console.error('Failed to update device list:', err));
    }

    /**
     * Triggers the target change event and updates the sensor list.
     * If the sensor list update fails, the error will be logged to the console.
     * @throws {Error} When the sensor list update fails
     */
    public selectDevice(): void {
        this.targetChange();
        this.updateSensorList().catch((err) => console.error('Failed to update sensor list:', err));
    }

    /**
     * Handles the selection of a sensor by triggering target changes and updating the channel list.
     * This method performs two main operations:
     * 1. Calls targetChange to handle selection updates
     * 2. Updates the list of available channels
     * 
     * Any errors during channel list update are logged to the console.
     * @throws {Error} When channel list update fails
     */
    public selectSensor(): void {
        this.targetChange();
        this.updateChannelList().catch((err) => console.error('Failed to update channel list:', err));
    }

    /**
     * Selects a channel and triggers related updates.
     * This method performs two actions:
     * 1. Calls targetChange to handle target-related changes
     * 2. Updates the value list asynchronously
     * 
     * Any errors during value list update are logged to console
     */
    public selectChannel(): void {
        this.targetChange();
        this.updateValueList().catch((err) => console.error('Failed to update value list:', err));
    }
    /**
     * Triggers the target change operation.
     * This method serves as a wrapper to invoke the target change functionality.
     */
    public selectValue(): void {
        this.targetChange();
    }
    
    /**
     * Triggers property selection and calls targetChange handler.
     * This method is responsible for handling property selection events.
     */
    public selectProperty(): void {
        this.targetChange();
    }

    /**
     * Triggers a target change when a filter property is selected.
     * This method acts as a proxy to the targetChange method.
     */
    public selectFilterProperty(): void {
        this.targetChange();
    }

    /**
     * @private
     * @description Validates the current target configuration
     * @returns {string[]} Array of validation error messages
     * @throws {PRTGError} When target is not defined
     */
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

    /**
     * Retrieves unique metric names for a given metric type.
     * 
     * @param metricType - The type of metric to get names for, must be a key of the metric object
     * @returns An array of unique metric names if the metric type exists and contains valid items,
     *          undefined if the metric type doesn't exist or isn't an array
     */
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


    /**
     * Updates the target by merging a partial query with the existing target
     * @param newTarget - Partial PRTG query object containing properties to update
     */
    public updateTarget(newTarget: Partial<PRTGQuery>): void {
        this.target = {
            ...this.target,
            ...newTarget,
        };
    }

    
    /**
     * Adds templated variables to a metric list.
     * For each variable in the template service, adds an entry to the metric list
     * with the variable name prefixed with '$' and marked as templated.
     * 
     * @param metricList - An array of objects containing metric names and optional templated flag
     * @private
     */
    private addTemplatedVariables(metricList: Array<{ name: string; templated?: boolean }>): void {
        this.templateSrv.getVariables().forEach((variable) => {
            metricList.push({
                name: '$' + variable.name,
                templated: true,
            });
        });
    }



    /**
     * Checks if two PRTGQuery objects are equal by comparing their JSON string representations.
     * @param oldTarget - The first PRTGQuery object to compare, can be null
     * @param newTarget - The second PRTGQuery object to compare, can be null
     * @returns {boolean} True if both objects have identical JSON string representations, false otherwise
     * @private
     */
    private isEqual(oldTarget: PRTGQuery | null, newTarget: PRTGQuery | null): boolean {
        if (!oldTarget || !newTarget) {
            return false;
        }
        return JSON.stringify(oldTarget) === JSON.stringify(newTarget);
    }

    /**
     * Retrieves the current PRTG query target.
     * @returns {PRTGQuery} The PRTG query configuration object.
     */
    public getTarget(): PRTGQuery {
        return this.target;
    }

    /**
     * @async
     * @public
     * @description Updates the list of available PRTG groups
     * @throws {Error} When API request fails
     * @returns {Promise<void>}
     */
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

    /**
     * @async
     * @public
     * @description Updates the list of available devices based on selected group
     * @requires target.groupSelection
     * @throws {Error} When API request fails
     * @returns {Promise<void>}
     */
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

    /**
     * Updates the list of sensors based on the selected device.
     * Initializes the sensor list with a default 'All' option and template variables.
     * Then fetches available sensors for the specified device through the API.
     * 
     * @async
     * @throws {Error} If the API call to fetch sensors fails
     * @returns {Promise<void>} A promise that resolves when the sensor list is updated
     * 
     * @example
     * await updateSensorList(); // Updates sensor list for currently selected device
     * 
     * @see performSensorSuggestQuery
     * @see templateSrv.replace
     */
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

    /**
     * Updates the list of channels based on the current sensor selection.
     * @async
     * @description Retrieves and populates the channel list for the selected sensor.
     * The method starts by adding a wildcard option ('*') and template variables,
     * then fetches the specific channels from the API.
     * @throws {Error} When the API call fails to retrieve channel information
     * @returns {Promise<void>} A promise that resolves when the channel list has been updated
     * @example
     * ! Usage
     * await queryEditorController.updateChannelList();
     * 
     * @remarks
     * - Requires a valid sensor selection to function
     * - Applies template variable replacement to group, device, and sensor filters
     * - Handles API errors gracefully with console error logging
     */
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

    /**
     * Updates the value list for channel metrics based on selected filters.
     * 
     * @async
     * @description This method updates the available values list for metrics based on the current
     * channel selection. It first checks if there's a valid channel selection, then retrieves
     * filtered values using the datasource API.
     * 
     * @throws {Error} When the API call fails to retrieve values
     * 
     * @example
     * ```typescript
     * await controller.updateValueList();
     *  Updates this.metric.valueList with available metric values
     * ```
     * 
     * @returns {Promise<void>} A promise that resolves when the value list has been updated
     */
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



    /**
     * Updates the property list of the metric by creating a new array from the default scope's metric property list.
     * This method performs a shallow copy of the default property list to ensure independent modification.
     */
    updatePropertyList(): void {
        this.metric.propertyList = [...this.scopeDefaults.metric.propertyList];
    }


    /**
     * Updates the filter property list by creating a new array from the default metric filter property list.
     * This method performs a shallow copy of the default list to the metric's filter property list.
     */
    updateFilterPropertyList(): void {
        this.metric.filterPropertyList = [...this.scopeDefaults.metric.filterPropertyList];
    }

    /**
     * Retrieves the list of properties with their names and visible names.
     * @returns An array of objects containing property names and their corresponding display names.
     * Each object has a 'name' property for the internal name and a 'visible_name' property for display.
     */
    public getPropertyList(): Array<{ name: string; visible_name: string }> {
        return this.scopeDefaults.metric.propertyList;
    }

    /**
     * Retrieves an array of selectable options for query types.
     * Each option contains a label, value, and description derived from the queryTypeOptions object.
     * 
     * @returns {SelectableValue[]} An array of objects containing label, value, and description
     * for each query type option.
     */
    public getQueryTypeOptions(): SelectableValue[] {
        return Object.values(this.queryTypeOptions).map((mode) => ({
            label: mode.name,
            value: mode.value,
            description: `${mode.name} Mode`,
        }));
    }

    /**
     * Retrieves a list of metrics based on the specified metric type.
     * @param metricType - The type of metric to retrieve ('group', 'device', 'sensor', 'channel', 'value', 'propertyList', 'filterPropertyList')
     * @returns An array of metric objects containing name and optional visible_name and templated properties
     */
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

    
    /**
     * Clears selection data based on the specified selection type.
     * Cascades the clearing operation to dependent selections.
     * 
     * @param selectionType - The type of selection to clear. Valid values are:
     *                       'group', 'device', 'sensor', 'channel', 'value', 'property'
     * @remarks
     * When clearing a selection, all dependent selections are also cleared:
     * - Clearing a group clears device, sensor, channel, value, and property selections
     * - Clearing a device clears sensor, channel, value, and property selections
     * - Clearing a sensor clears channel, value, and property selections
     * - Clearing a channel clears value selections
     * - Clearing a property clears filter property lists
     * 
     * After clearing, triggers a target change event.
     */
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


    /**
     * Refreshes the selection lists in a hierarchical order: groups, devices, sensors, properties, channels, and values.
     * Each level is updated only if its parent selection exists.
     * The hierarchy follows: group -> device -> sensor -> (property, channel) -> value.
     * Triggers a target change event when the complete hierarchy is selected.
     * 
     * @returns A Promise that resolves when all applicable selection lists have been updated
     * @throws May throw errors if any of the update operations fail
     */
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

    /**
     * @public
     * @description Gets the validation status of the current target
     * @returns {{ isValid: boolean; errors: string[] }} Validation result
     */
    public getValidationStatus(): { isValid: boolean; errors: string[] } {
        const errors = this.validateTarget();
        return {
            isValid: errors.length === 0,
            errors: errors,
        };
    }

    
    /**
     * Resets the target object to its default state.
     * This method initializes a new target with default values for all properties including:
     * - Reference ID (generated automatically)
     * - Query type (set to 'metrics')
     * - Empty selections for group, device, sensor, channel, value, and properties
     * - Empty raw request configuration
     * - Empty transformations array
     * - Default options with empty names and false flags for inclusions
     * - Default query options with display mode and empty property configurations
     * 
     * After resetting the target, it triggers the targetChange event.
     * 
     * @returns void
     */
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
                target: '*',  
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
                target: '*',  
                textProperty: { name: '', visible_name: '' }
            }
        };
        this.targetChange();
    }

    /**
     * @public
     * @description Applies template variables to a selection string
     * @param {string} selection - The selection string to process
     * @returns {string} Processed selection string with replaced variables
     */
    public applyTemplateVariables(selection: string): string {
        return this.templateSrv.replace(selection, {}, 'regex');
    }

    /**
     * @public
     * @description Cleans up resources when the controller is disposed
     * @returns {void}
     */
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

    /**
     * Retrieves the next reference ID based on the current target's reference ID.
     * Uses a predefined set of letters to determine the sequence.
     * 
     * @returns The next available reference ID letter. If no valid next letter is found, returns 'A'.
     */
    private getNextRefId(): string {
        const letters = this.targetLetters.split('');
        const currentRefId = this.target?.refId || 'A';
        const index = Math.max(0, letters.indexOf(currentRefId));
        return letters[index] || 'A';
    }
}


