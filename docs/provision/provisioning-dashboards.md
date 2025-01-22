# Making changes to a provisioned dashboard

While you can change a provisioned dashboard in the Grafana UI, those changes can't be saved back to the provisioning source. If `allowUiUpdates` is set to true and you make changes to a provisioned dashboard, you can Save the dashboard, then changes persist to the Grafana database.

> **Note**
> 
> If a provisioned dashboard is saved from the UI and then later updated from the source, the dashboard stored in the database will always be overwritten. The version property in the JSON file won't affect this, even if it's lower than the version of the existing dashboard.

If a provisioned dashboard is saved from the UI and the source is removed, the dashboard stored in the database is deleted unless the configuration option `disableDeletion` is set to true.

If `allowUiUpdates` is configured to false, you are not able to make changes to a provisioned dashboard. When you click Save, Grafana brings up a "Cannot save provisioned dashboard" dialog.

## Exporting Dashboard Changes

Grafana offers options to export the JSON definition of a dashboard:
- Copy JSON to Clipboard
- Save JSON to file

These options can help you synchronize your dashboard changes back to the provisioning source.

> **Note**
>
> The JSON definition in the input field when using Copy JSON to Clipboard or Save JSON to file has the `id` field automatically removed to aid the provisioning workflow.
