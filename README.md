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
