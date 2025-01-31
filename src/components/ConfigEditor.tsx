import React, { ChangeEvent } from 'react';
import { InlineField, Input } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { PRTGDataSourceConfig } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<PRTGDataSourceConfig> { }

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  const onHostnameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        hostname: event.target.value,
      },
    });
  };

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        username: event.target.value,
      },
    });
  };

  const onPasshashChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        passhash: value,
      },
    });
  };

  const onCacheTimeoutChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        cacheTimeout: value > 0 ? value : 300,
      },
    });
  };

  return (
    <>
      <h1>API Configuration:</h1>
      <InlineField label="Hostname" labelWidth={20} interactive tooltip={'Hostname for the API'}>
        <Input
          id="config-editor-hostname"
          onChange={onHostnameChange}
          value={jsonData.hostname}
          placeholder="Enter the hostname, e.g. yourserver"
          width={40}
        />
      </InlineField>
      <InlineField label="Username" labelWidth={20} interactive tooltip={'Username for the API'}>
        <Input
          id="config-editor-username"
          onChange={onUsernameChange}
          value={jsonData.username}
          placeholder="Enter the username, e.g. myuser"
          width={40}
        />
      </InlineField>
      <InlineField label="Passhash" labelWidth={20} interactive tooltip={'Passhash for the API'}>
        <Input
        type='password'
          id="config-editor-passhash"
          value={jsonData.passhash || ''}
          placeholder="Enter your passhash"
          width={40}
          onChange={onPasshashChange}
        />
      </InlineField>
      <InlineField label="Cache Timeout" labelWidth={20} interactive tooltip={'Cache timeout in seconds'}>
        <Input
          type="number"
          id="config-editor-cache-timeout"
          onChange={onCacheTimeoutChange}
          value={jsonData.cacheTimeout || 300}
          placeholder="Enter cache timeout in seconds"
          width={40}
        />
      </InlineField>
    </>
  );
}
