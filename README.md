# hubspot-shaper

A CLI tool for managing HubSpot CRM schema across environments.

## Features

- Discover environment schema
- Export schema to portable JSON snapshots
- Diff environments
- Apply schema safely and deterministically

## Philosophy

hubspot-shaper treats HubSpot schema as code:

- Environment-aware
- Git-friendly
- Deterministic
- Non-destructive by default

## Setup

```bash
npm install
```

## Usage
npm run dev -- discover --env prod

## Environment Variables

You must define:

HUBSPOT_PROD_TOKEN
HUBSPOT_DEV_TOKEN

```powershell
$env:HUBSPOT_PROD_TOKEN="your-token"

$env:HUBSPOT_DEV_TOKEN="your-token"
```

## Config
.hubspot-shaper.json

```json
{
  "environments": {
    "prod": {
      "portalId": "123456",
      "auth": {
        "type": "private_app",
        "tokenEnvVar": "HUBSPOT_PROD_TOKEN"
      }
    }
  }
}
```
## Status
Early development — milestone-based build

## Added Ignored Files

```text
dist/
schemas/
.hubspot-shaper.local.json
```
