# Grafana Data Source Plugin for PRTG

A Grafana data source plugin for integrating PRTG Network Monitor metrics into your Grafana dashboards.

## What are Grafana data source plugins?

The **PRTG Network Monitor** is a versatile tool for network monitoring. IT teams can use it to monitor the performance and availability of their network components in real-time and identify issues early. With its wide range of features, PRTG Network Monitor enables IT administrators to efficiently manage their network infrastructure and ensure smooth operation.

A new data source is to be developed in a **Grafana plugin**, allowing data to be extracted from the **PRTG REST API** and displayed in dashboards using Grafana’s visualization options. The implementation will be carried out in **JavaScript (Node.js)** and **React** for the user interface to ensure a modern and high-performance integration.

To ensure the functionality of the plugin, it will undergo **comprehensive testing**. Without backend integration, **unit testing** will be conducted using **Jest**, while frontend functions and interactions within the Grafana environment will be tested with **Cypress**. This testing process ensures both data consistency and usability.

The plugin will be developed to be compatible with the **latest version of Grafana (10+)**. Through seamless integration and simple configuration, users will be able to retrieve and visualize their **PRTG data** in just a few steps. A successful testing process not only confirms the technical functionality but also ensures a **positive user experience**.

## Technical Details

- Built with JavaScript (Node.js) and React
- Compatible with Grafana 10+
- Comprehensive testing using Jest for unit tests and Cypress for frontend integration tests
- Easy configuration and data extraction from PRTG REST API

## API Calls for Historic Data

The API calls for historic data tables look like this:

### Historic data in JSON format:

<pre><b>/api/historicdata.json</b>?id=objectid&avg=0&sdate=2025-01-20-00-00-00&edate=2025-01-21-00-00-00&usecaption=1</pre>

# Common Parameters for Historic Data API Calls

The following parameters can be used for the graphs and the data tables:

| **Parameter** | **Description**                                                                                   | **Possible values**         |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| id                  | ID of the specific sensor                                                                               | integer value                     |
| sdate               | Start of the time span (date and time)                                                                  | yyyy-mm-dd-hh-mm-ss               |
| edate               | End of the time span (date and time)                                                                    | yyyy-mm-dd-hh-mm-ss               |
| avg                 | Average interval in seconds; use 0 to download raw data                                                 | integer value                     |
| width/height        | Width and height of the graph in pixels                                                                 | integer value                     |
| graphstyling        | baseFontSize and showLegend settings                                                                    | baseFontSize='x'%20showLegend='x' |

## Object Properties and Status

### Getting Single Object Properties
To get properties/settings or status information of an object, use:

<pre><b>/api/getobjectproperty.htm</b>?id=objectid&name=propertyname&show=text</pre>
<pre><b>/api/getobjectstatus.htm</b>?id=objectid&name=columnname&show=text</pre>

### Sensor Details
Get sensor details in JSON or XML format:

<pre><b>/api/getsensordetails.json</b>?id=sensorid</pre>
<pre><b>/api/getsensordetails.xml</b>?id=sensorid</pre>

## Multiple Object Properties

Use the table.xml API function to get data in tables:

<pre><b>/api/table.xml</b>?content=sensortree</pre>
<pre><b>/api/table.xml</b>?content=sensors&columns=objid,group,device,sensor,status,message</pre>

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.
