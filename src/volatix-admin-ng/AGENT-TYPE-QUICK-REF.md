# Agent Type Feature - Quick Reference

## What's New?

Added ability to specify agent type as **Docker** (🐳) or **Service Fabric** (⚙️) with dynamic icon display throughout the application.

---

## Quick Guide

### 1. Setting Agent Type

**Location**: Settings → Agent Configuration

```
Agent Type: [🐳 Docker ▼]
            └─ Options:
               - 🐳 Docker
               - ⚙️ Service Fabric
```

### 2. Icon Display

| Type           | Icon | Where Shown                          |
| -------------- | ---- | ------------------------------------ |
| Docker         | 🐳   | Agent cards, tables, service details |
| Service Fabric | ⚙️   | Agent cards, tables, service details |

### 3. Default Behavior

- **New agents**: Default to Docker (🐳)
- **Existing agents**: Default to Docker (🐳) until updated
- **Missing type**: Falls back to Docker (🐳)

---

## UI Locations Updated

✅ **Settings Page**

- Dropdown to select agent type
- Type column in agents table with icon

✅ **Services List Page**

- Agent selection cards show type icon
- Services table shows agent icon

✅ **Service Detail Page**

- Agent status card shows type icon

---

## Files Modified

### Models:

- `agent.model.ts` - Added `type?: 'docker' | 'servicefabric'`

### Settings:

- `settings.ts` - Added type to form, helper methods
- `agent-settings.html` - Added dropdown, type column

### Services List:

- `services-list.ts` - Added `getAgentIcon()` method
- `services-list.html` - Dynamic icons in cards & table

### Service Detail:

- `service-detail.ts` - Added `getAgentIcon()` method
- `service-detail.html` - Dynamic icon in agent status card

---

## Backend Changes Needed

### API Request (Create/Update Agent):

```json
{
  "name": "my-agent",
  "url": "https://agent.example.com",
  "type": "docker" // or "servicefabric"
}
```

### API Response (Get Agents):

```json
{
  "id": "agent-123",
  "name": "my-agent",
  "type": "docker",  // Include this field
  ...
}
```

### Database:

```sql
ALTER TABLE Agents ADD Type VARCHAR(20) DEFAULT 'docker';
```

---

## Testing

### Quick Test Steps:

1. Go to Settings
2. Create agent with Docker type → Should show 🐳
3. Create agent with Service Fabric type → Should show ⚙️
4. Edit agent and change type → Icon should update
5. Check Services List → Should show correct icons
6. Check Service Detail → Should show correct icon

---

## Migration

- **Existing agents without type**: Will display 🐳 (Docker) by default
- **No breaking changes**: Type field is optional
- **Update existing agents**: Go to Settings → Edit → Select Type → Save

---

_Created: October 10, 2025_
_See: AGENT-TYPE-FEATURE.md for full documentation_
