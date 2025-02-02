# Include dashboards

This guide explains how to add pre-configured dashboards into data source Grafana plugins. By integrating pre-configured dashboards into your plugin, you provide users with ready-to-use templates.

## Step 1: Create a dashboard

1. Create the dashboard in your development environment.
2. Export the dashboard:
    - Open dashboard in Grafana
    - Click Share icon
    - Click Export
    - Select "Export for sharing externally"
    - Save to file

> **Note**: Exporting replaces data source references with placeholders, ensuring compatibility.

## Step 2: Add dashboard to plugin

1. Create `dashboards` folder in `src` directory:

```
myorg-myplugin-datasource/
└── src/
     ├── dashboards/
     │   └── overview.json
     ├── module.ts
     └── plugin.json
```

2; Update `plugin.json` to include dashboard:

```json
{
  "includes": [
     {
        "name": "overview",
        "path": "dashboards/overview.json",
        "type": "dashboard"
     }
  ]
}
```

> **Important**: Use paths relative to `src` directory.

3; Rebuild plugin and restart Grafana.

## Step 3: Import dashboard

1. Create/edit data source instance
2. Click Dashboards tab
3. Click Import next to desired dashboard

## Benefits

- Improved user onboarding
- Ready-to-use configurations
- Enhanced user efficiency
