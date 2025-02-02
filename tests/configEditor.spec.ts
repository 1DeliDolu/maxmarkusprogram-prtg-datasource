import { test, expect } from '@grafana/plugin-e2e';
import { PRTGDataSourceConfig, PRTGSecureJsonData } from '../src/types';

test('Smoke Test: Configuration editor should load properly', async ({ createDataSourceConfigPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await createDataSourceConfigPage({ type: ds.type });
  await expect(page.getByLabel('Path')).toBeVisible();
});

test('Save & Test: Should pass when configuration is valid', async ({ createDataSourceConfigPage, readProvisionedDataSource, selectors, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  const configPage = await createDataSourceConfigPage({ type: ds.type });

  const healthCheckPath = `${selectors.apis.DataSource.proxy(
    configPage.datasource.uid,
    configPage.datasource.id.toString()
  )}/health`;

  await page.route(healthCheckPath, async (route) => await route.fulfill({ status: 200, body: 'OK' }));
  
  await expect(configPage.saveAndTest({ path: healthCheckPath })).toBeOK();
  await expect(configPage).toHaveAlert('success', { hasText: 'Data source is working!' });
});

test('Save & Test: Should fail with an error message when configuration is invalid', async ({ createDataSourceConfigPage, readProvisionedDataSource, selectors, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  const configPage = await createDataSourceConfigPage({ type: ds.type });

  const healthCheckPath = `${selectors.apis.DataSource.proxy(
    configPage.datasource.uid,
    configPage.datasource.id.toString()
  )}/health`;

  await page.route(healthCheckPath, async (route) => await route.fulfill({ status: 500, body: 'Internal Server Error' }));

  await expect(configPage.saveAndTest({ path: healthCheckPath })).not.toBeOK();
  await expect(configPage).toHaveAlert('error', { hasText: 'Failed to connect to the data source' });
});
