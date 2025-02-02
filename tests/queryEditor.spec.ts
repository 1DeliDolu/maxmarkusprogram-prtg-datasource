import { test, expect } from '@grafana/plugin-e2e';

test('Smoke Test: Query editor should render correctly', async ({ panelEditPage, readProvisionedDataSource }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await expect(panelEditPage.getQueryEditorRow('A').getByRole('textbox', { name: 'Query Text' })).toBeVisible();
});

test('Valid Query: Should return expected data', async ({ panelEditPage, readProvisionedDataSource }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Table');
  await panelEditPage.getQueryEditorRow('A').getByRole('textbox', { name: 'Query Text' }).fill('SELECT * FROM dataset');
  await expect(panelEditPage.panel.fieldNames).toContainText(['Time', 'Value']);
  await expect(panelEditPage.panel.data).toContainText(['10']);
});

test('Invalid Query: Should return an error message', async ({ panelEditPage, readProvisionedDataSource }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Table');
  await panelEditPage.getQueryEditorRow('A').getByRole('textbox', { name: 'Query Text' }).fill('INVALID QUERY');
  await expect(panelEditPage.panel.fieldNames).not.toContainText(['Time', 'Value']);
  await expect(panelEditPage).toHaveAlert('error', { hasText: 'Query failed' });
});
