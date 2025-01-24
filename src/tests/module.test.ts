import { DataSourcePlugin } from '@grafana/data';
import { PRTGDataSource } from '../datasource';
import { ConfigEditor } from '../components/ConfigEditor';
import { QueryEditor } from '../components/QueryEditor';
import { plugin } from '../module';

describe('PRTG Plugin', () => {
    it('should be instance of DataSourcePlugin', () => {
        expect(plugin).toBeInstanceOf(DataSourcePlugin);
    });

    it('should be configured with correct components', () => {
        const pluginInstance = plugin as DataSourcePlugin<PRTGDataSource>;
        
        // Test that the plugin has the required components
        expect(pluginInstance).toHaveProperty('components');
        expect(pluginInstance).toHaveProperty('DataSourceClass');
    });

    it('should have the correct component types', () => {
        const components = (plugin as any).components;
        expect(components.ConfigEditor).toBe(ConfigEditor);
        expect(components.QueryEditor).toBe(QueryEditor);
    });
});