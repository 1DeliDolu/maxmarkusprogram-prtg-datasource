import React, { useEffect, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { Select, InlineField, Stack, FieldSet, InlineSwitch } from '@grafana/ui';
import { PRTGDataSource } from '../datasource';
import { PRTGQuery, PRTGDataSourceConfig } from '../types';
import { QueryEditorController } from '../QueryEditorController';


type Props = QueryEditorProps<PRTGDataSource, PRTGQuery, PRTGDataSourceConfig>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  
  const [controller] = useState(() => new QueryEditorController(query, datasource, datasource.templateSrv, { refresh: onRunQuery }));
  const [lists, setLists] = useState({
    groups: [] as SelectableValue[],
    devices: [] as SelectableValue[],
    sensors: [] as SelectableValue[],
    channels: [] as SelectableValue[],
    values: [] as SelectableValue[],
    properties: [] as SelectableValue[],
    filterProperties: [] as SelectableValue[]
  });
  useEffect(() => {
    refreshLists();
    return () => controller.dispose();
    // eslint-disable-next-line
  }, []);

  const refreshLists = async () => {
    await controller.refreshSelectionLists();
    updateSelectLists();
  };

  const updateSelectLists = () => {
    try {
      const getList = (type: string) => {
        const list = controller.getMetricList(type) || [];
        return list.map(item => ({
          label: item.visible_name || item.name,
          value: item.name
        }));
      };

      setLists({
        groups: getList('group'),
        devices: getList('device'),
        sensors: getList('sensor'),
        channels: getList('channel'),
        values: getList('value'),
        properties: getList('propertyList'),
        filterProperties: getList('filterPropertyList')
      });
    } catch (error) {
      console.error('Error updating select lists:', error);
      setLists({
        groups: [],
        devices: [],
        sensors: [],
        channels: [],
        values: [],
        properties: [],
        filterProperties: []
      });
    }
  };

  const onGroupChange = async (value: SelectableValue<string>) => {
    controller.updateTarget({
      groupSelection: { name: value.value || '' },
      options: {
        ...target.options,
        groupName: {
          name: value.value || '',
          visible_name: value.label || ''
        }
      }
    });
    controller.selectGroup();
    updateSelectLists();
    onChange(controller.getTarget());
    onRunQuery();
  };

  const onDeviceChange = async (value: SelectableValue<string>) => {
    controller.updateTarget({
      deviceSelection: { name: value.value || '' },
      options: {
        ...target.options,
        deviceName: {
          name: value.value || '',
          visible_name: value.label || '',
        }
      }
    });
    controller.selectDevice();
    updateSelectLists();
    onChange(controller.getTarget());
    onRunQuery();
  };

  const onSensorChange = async (value: SelectableValue<string>) => {
    controller.updateTarget({
      sensorSelection: { name: value.value || '' },
      options: {
        ...target.options,
        sensorName: {
          name: value.value || '',
          visible_name: value.label || ''
        }
      }
    });
    controller.selectSensor();
    updateSelectLists();
    onChange(controller.getTarget());
    onRunQuery();
  };

  const onPropertyChange = (value: SelectableValue<string>) => {
    controller.updateTarget({
      propertySelection: { name: value.value || '' },
      options: {
        ...target.options,
        propertyName: {
          name: value.value || '',
          visible_name: value.label || ''
        }
      }
    });
    updateSelectLists();
    onChange(controller.getTarget());
    onRunQuery();
  };

  const onFilterPropertyChange = (value: SelectableValue<string>) => {
    controller.updateTarget({
      filterPropertySelection: { name: value.value || '' },
      options: {
        ...target.options,
        filterPropertyName: {
          name: value.value || '',
          visible_name: value.label || ''
        }
      }
    });
    updateSelectLists();
    onChange(controller.getTarget());
    onRunQuery();
  };

  const onChannelChange = async (value: SelectableValue<string>) => {
    controller.updateTarget({
      channelSelection: { name: value.value || '' }
    });
    controller.selectChannel();
    updateSelectLists();
    onChange(controller.getTarget());
    onRunQuery();

  };

  const onValueChange = async (values: SelectableValue<string> | Array<SelectableValue<string>>) => {
    const selectedValues = Array.isArray(values)
      ? values.map(v => v.value).join(',')
      : values?.value || '';

    controller.updateTarget({
      valueSelection: { name: selectedValues }
    });
    controller.selectValue();
    updateSelectLists();
    onChange(controller.getTarget());
    onRunQuery();
  };



  const onQueryTypeChange = (value: SelectableValue<string>) => {
    controller.updateTarget({
      queryType: value.value as 'metrics' | 'raw' | 'text',
      options: {
        ...target.options,
        mode: {
          name: value.value as string,
          value: value.value as string,
          filterProperty: {},
          valueSource: {},
          valueProperty: {}
        }
      }
    });
    onChange(controller.getTarget());
    onRunQuery();
  };



  const queryTypeOptions: Array<SelectableValue<string>> = controller.getQueryTypeOptions();
  const target = controller.getTarget();

  // Fix the mode checks to use queryType directly
  const isMetricsMode = target.queryType === 'metrics';
  const isRawMode = target.queryType === 'raw';
  const isTextMode = target.queryType === 'text';

  return (
    <Stack direction="column" gap={1}>
      <Stack direction="row" gap={4}>
        <Stack direction="column" gap={1}>
          <InlineField label="Query Type" labelWidth={20} grow>
            <Select
              options={queryTypeOptions}
              value={target.queryType}
              onChange={onQueryTypeChange}
              width={47}
            />
          </InlineField>

          <InlineField label="Group" labelWidth={20} grow>
            <Select
              isLoading={!lists.groups.length}
              options={lists.groups}
              value={target.groupSelection?.name}
              onChange={onGroupChange}
              width={47}
              allowCustomValue
              isClearable
              isDisabled={!target.queryType}
              placeholder="Select Group or type '*'"
            />
          </InlineField>

          <InlineField label="Device" labelWidth={20} grow>
            <Select
              isLoading={!lists.devices.length}
              options={lists.devices}
              value={target.deviceSelection?.name}
              onChange={onDeviceChange}
              width={47}
              allowCustomValue
              placeholder="Select Device or type '*'"
              isClearable
              isDisabled={!target.groupSelection?.name}
            />
          </InlineField>
        </Stack>

        <Stack direction="column" gap={1}>
          <InlineField label="Sensor" labelWidth={20} grow>
            <Select
              isLoading={!lists.sensors.length}
              options={lists.sensors}
              value={target.sensorSelection?.name}
              onChange={onSensorChange}
              width={47}
              allowCustomValue
              placeholder="Select Sensor or type '*'"
              isClearable
              isDisabled={!target.deviceSelection?.name}
            />
          </InlineField>

            <InlineField label="Channel Count" labelWidth={20} grow>
            <Select
              isLoading={isMetricsMode ? !lists.values.length : false}
              options={lists.channels}
              value={target.channelSelection?.name}
              onChange={onChannelChange}
              width={47}
              allowCustomValue
              placeholder="Select Channel or type '*'"
              isClearable
              isDisabled={!target.sensorSelection?.name || !isMetricsMode}
            />
            </InlineField>

          <InlineField label="Channels" labelWidth={20}>
            <Select
              isLoading={isMetricsMode ? !lists.values.length : false}
              options={lists.values}
              value={target.valueSelection?.name}
              onChange={onValueChange}
              placeholder='Select Channel or type "*"'
              isClearable
              isMulti={true}
              width={47}
              isDisabled={!target.channelSelection?.name || isRawMode || isTextMode}
            />
          </InlineField>
        </Stack>
      </Stack>

      <FieldSet label="Options">
        {!isMetricsMode && (
          <Stack direction="row" gap={2}>
            <InlineField label="Property" labelWidth={20}>
              <Select
                width={47}
                value={{
                  label: target.options?.propertyName?.visible_name || target.propertySelection?.name,
                  value: target.propertySelection?.name || ''
                }}
                isDisabled={!target.sensorSelection?.name}
                onChange={onPropertyChange}
                options={lists.properties}
                placeholder="Select Property"
              />
            </InlineField>

            <InlineField label="Filter Property" labelWidth={20}>
              <Select
                width={47}
                value={{
                  label: target.options?.filterPropertyName?.visible_name || target.filterPropertySelection?.name,
                  value: target.filterPropertySelection?.name || ''
                }}
                isDisabled={!target.sensorSelection?.name}
                onChange={onFilterPropertyChange}
                options={lists.filterProperties}
                placeholder="Select Filter Property"
              />
            </InlineField>
          </Stack>
        )}

        {isMetricsMode && (
          <Stack direction="row" gap={1}>
            <InlineField label="Include Group" labelWidth={16}>
              <InlineSwitch
                value={target.options?.includeGroupName || false}
                onChange={(e) => {
                  controller.updateTarget({
                    options: {
                      ...target.options,
                      includeGroupName: e.currentTarget.checked,
                    },
                  });
                  onChange(controller.getTarget());
                  onRunQuery(); // Add this to trigger query update
                }}
              />
            </InlineField>

            <InlineField label="Include Device" labelWidth={15}>
              <InlineSwitch
                value={target.options?.includeDeviceName || false}
                onChange={(e) => {
                  controller.updateTarget({
                    options: {
                      ...target.options,
                      includeDeviceName: e.currentTarget.checked,
                    },
                  });
                  onChange(controller.getTarget());
                  onRunQuery(); // Add this to trigger query update
                }}
              />
            </InlineField>

            <InlineField label="Include Sensor" labelWidth={15}>
              <InlineSwitch
                value={target.options?.includeSensorName || false}
                onChange={(e) => {
                  controller.updateTarget({
                    options: {
                      ...target.options,
                      includeSensorName: e.currentTarget.checked,
                    },
                  });
                  onChange(controller.getTarget());
                  onRunQuery(); // Add this to trigger query update
                }}
              />
            </InlineField>
          </Stack>
        )}
      </FieldSet>
    </Stack>
  );
}
