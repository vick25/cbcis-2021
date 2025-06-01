# Congo Basin Catchment Information System (CB-CIS)

A web-based GIS application for visualizing and analyzing catchment data in the Congo Basin region.

## Overview

The CB-CIS (Congo Basin Catchment Information System) is a geospatial web application that provides access to catchment data and analysis tools for the Congo Basin region. The system integrates GeoServer for spatial data serving and uses Nginx as a reverse proxy.

## Technology Stack

- **Frontend**:
  - HTML5/CSS3
  - Bootstrap 4.6.0
  - Leaflet.js for mapping
  - Chart.js for data visualization
  - jQuery 3.5.1

- **Backend**:
  - GeoServer for spatial data services
  - Nginx as reverse proxy
  - PostgreSQL database

- **Infrastructure**:
  - Docker containers
  - Docker Compose for orchestration

## Project Structure

```
docker/
├── app/                 # Web application frontend
├── nginx/              # Nginx configuration
│   ├── default.conf    # Nginx reverse proxy config
│   └── Dockerfile      # Nginx container build file
├── docker/             # Docker related files
│   └── geoserver/      # GeoServer configuration
├── db/                 # Database initialization scripts
└── docker-deploy-nginx.yaml  # Docker Compose file
```

## Features

- Interactive mapping interface
- Catchment data visualization
- Multi-language support (English and French)
- Measurement and analysis tools
- Data export capabilities
- Responsive design for mobile devices

## Setup

1. Clone the repository
2. Configure environment variables in `.env` file
3. Build and start the containers:

```bash
docker-compose -f docker-deploy-nginx.yaml up -d
```

## Access

- Web Application: `http://localhost:8700`
- GeoServer: `http://localhost:8700/geoserver`

## Partners

- Royal Society
- African Academy of Sciences
- University of Kinshasa (UNIKIN)

## License

[Add License Information]

## Authors

CRREBaC (Centre de Recherche en Ressources en Eau du Bassin du Congo)