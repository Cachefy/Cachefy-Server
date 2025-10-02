# Service CRUD Feature Documentation

## Overview
Added full CRUD (Create, Read, Update, Delete) functionality to the Services List component with API integration and validation.

## Features Implemented

### 1. **Create Service**
- Modal form to add new services
- Validates required fields
- Sends POST request to `/api/services`
- Shows success/error notifications
- Reloads service list after creation

### 2. **Read Services**
- Loads services from API on component initialization
- Displays in paginated table (6 per page)
- Shows service status with color-coded icons
- Handles loading errors gracefully

### 3. **Update Service**
- Edit button opens pre-filled modal form
- Validates changes before submission
- Sends PUT request to `/api/services/{id}`
- Updates local list after successful update
- Shows success/error notifications

### 4. **Delete Service**
- Delete button with confirmation dialog
- Sends DELETE request to `/api/services/{id}`
- Removes from local list after successful deletion
- Shows success/error notifications

## Component Structure

### TypeScript (`services-list.ts`)

**New Properties:**
```typescript
showServiceForm = signal(false);      // Controls modal visibility
editingService = signal<Service | null>(null); // Tracks edit mode
serviceForm = {                       // Form data model
  name: '',
  status: 'Healthy',
  instances: 1,
  url: '',
  version: '',
  description: ''
};
```

**New Methods:**

| Method | Purpose |
|--------|---------|
| `openCreateForm()` | Opens empty form for new service |
| `openEditForm(service)` | Opens form pre-filled with service data |
| `closeForm()` | Closes modal and clears form |
| `clearForm()` | Resets form to default values |
| `validateForm()` | Client-side validation before API call |
| `saveService()` | Handles both create and update operations |
| `deleteService(service)` | Deletes service with confirmation |

**Dependencies Injected:**
- `DataService` - API calls
- `Router` - Navigation
- `ConfirmationService` - Confirm dialogs
- `NotificationService` - Success/error messages

### Template (`services-list.html`)

**Added Components:**
1. **"Add Service" Button** - Top right of table
2. **Edit Button** - In each table row
3. **Delete Button** - In each table row
4. **Modal Form** - Overlay with service form

**Form Fields:**
- Service Name (required)
- Service URL
- Status (dropdown: Healthy, Degraded, Down, Maintenance)
- Instances (number)
- Version
- Description (textarea)

### Styles (`services-list.css`)

**New Style Classes:**
- `.modal-overlay` - Dark backdrop with blur
- `.modal-content` - Modal container
- `.modal-header` - Title and close button
- `.modal-body` - Form content
- `.modal-actions` - Footer with buttons
- `.form-group` - Form field wrapper
- `.form-input` - Styled input/select/textarea
- `.form-row` - Two-column layout for fields

## API Integration

### Endpoints Used

```typescript
// GET all services
GET /api/services
Authorization: Bearer <token>
Response: Service[]

// CREATE service
POST /api/services
Authorization: Bearer <token>
Body: {
  name: string,
  status: string,
  instances: number,
  url?: string,
  version?: string,
  description?: string
}
Response: Service

// UPDATE service
PUT /api/services/{id}
Authorization: Bearer <token>
Body: {
  id: string,
  name: string,
  status: string,
  instances: number,
  url?: string,
  version?: string,
  description?: string
}
Response: Service

// DELETE service
DELETE /api/services/{id}
Authorization: Bearer <token>
Response: 204 No Content
```

### Request Flow

#### Create Service:
```
1. User clicks "Add Service"
2. Modal opens with empty form
3. User fills form and clicks "Create Service"
4. Component validates form data
5. DataService.saveService() sends POST to API
6. API returns created service with ID
7. Component reloads services list
8. Success notification shown
9. Modal closes
```

#### Update Service:
```
1. User clicks "Edit" on table row
2. Modal opens with pre-filled form
3. User modifies fields and clicks "Update Service"
4. Component validates form data
5. DataService.saveService() sends PUT to API
6. API returns updated service
7. Component reloads services list
8. Success notification shown
9. Modal closes
```

#### Delete Service:
```
1. User clicks "Delete" on table row
2. Confirmation dialog appears
3. User confirms deletion
4. DataService.deleteService() sends DELETE to API
5. API deletes service and returns 204
6. Component reloads services list
7. Success notification shown
```

## Validation

### Client-Side Validation
- **Service Name**: Required, cannot be empty
- **Instances**: Must be >= 0
- All validations show error notifications

### Server-Side Validation
- API should validate:
  - Name is unique
  - URL format is valid
  - Status is valid enum value
  - All required fields present

### Error Handling

**Network Errors:**
```typescript
this.dataService.saveService(data).subscribe({
  next: (service) => {
    // Success handling
  },
  error: (error) => {
    // Error already shown by DataService
    console.error('Failed to save service:', error);
  }
});
```

**API Errors:**
- 400 Bad Request → Validation error notification
- 401 Unauthorized → Redirect to login
- 404 Not Found → "Service not found" notification
- 500 Server Error → Generic error notification

## User Experience

### Visual Feedback

**Status Icons:**
- ✓ Healthy (green)
- ⚠ Degraded (orange)
- ✗ Down (red)
- 🔧 Maintenance (gray)

**Buttons:**
- **Add Service** - Primary blue button with + icon
- **Edit** - Secondary button with pencil icon
- **Delete** - Danger red button with trash icon
- **Details** - Primary button with info icon

**Modal:**
- Dark overlay with blur effect
- Centered modal with smooth animations
- Close button (X) in top-right
- Cancel and Submit buttons in footer

### Accessibility
- All buttons have descriptive labels
- Form fields have proper labels
- Modal can be closed via close button or backdrop click
- Form can be submitted via Enter key
- All inputs have placeholders

## Testing Checklist

### Create Service
- [ ] Open create form
- [ ] Fill all fields
- [ ] Submit form
- [ ] Verify API POST request sent with correct data
- [ ] Verify service appears in list after creation
- [ ] Verify success notification shown
- [ ] Test validation: empty name
- [ ] Test validation: negative instances

### Update Service
- [ ] Click edit on existing service
- [ ] Verify form pre-filled with current data
- [ ] Modify fields
- [ ] Submit form
- [ ] Verify API PUT request sent with correct data
- [ ] Verify service updated in list
- [ ] Verify success notification shown

### Delete Service
- [ ] Click delete on existing service
- [ ] Verify confirmation dialog appears
- [ ] Click cancel - verify service not deleted
- [ ] Click delete again and confirm
- [ ] Verify API DELETE request sent
- [ ] Verify service removed from list
- [ ] Verify success notification shown

### Error Handling
- [ ] Test with API down - verify error notification
- [ ] Test with invalid data - verify validation messages
- [ ] Test with expired token - verify redirect to login
- [ ] Test with network error - verify error handling

### UI/UX
- [ ] Modal opens and closes smoothly
- [ ] Form fields are properly styled
- [ ] Buttons have hover effects
- [ ] Table remains responsive
- [ ] Pagination still works
- [ ] Status icons display correctly

## Example Usage

### Creating a Service

```typescript
// User fills form:
serviceForm = {
  name: 'Payment Service',
  url: 'https://api.payments.com',
  status: 'Healthy',
  instances: 3,
  version: '2.1.0',
  description: 'Handles all payment processing'
}

// Click "Create Service"
// → POST /api/services
// → Response: { id: 'payment-service', ...serviceForm, createdAt: '...', updatedAt: '...' }
// → Service added to list
// → Notification: "Service 'Payment Service' created successfully"
```

### Editing a Service

```typescript
// User clicks Edit on "Payment Service"
// Form pre-filled with current data
// User changes instances: 3 → 5
// User changes status: 'Healthy' → 'Maintenance'

// Click "Update Service"
// → PUT /api/services/payment-service
// → Response: { id: 'payment-service', instances: 5, status: 'Maintenance', ...}
// → Service updated in list
// → Notification: "Service 'Payment Service' updated successfully"
```

### Deleting a Service

```typescript
// User clicks Delete on "Payment Service"
// Confirmation dialog: "Are you sure you want to delete Payment Service?"
// User clicks "Delete"

// → DELETE /api/services/payment-service
// → Response: 204 No Content
// → Service removed from list
// → Notification: "Service 'Payment Service' deleted successfully"
```

## Future Enhancements

1. **Batch Operations** - Select multiple services and delete/update
2. **Search/Filter** - Search services by name or filter by status
3. **Sort** - Sort table by name, status, instances, etc.
4. **Import/Export** - Bulk import services from JSON/CSV
5. **Service Health Check** - Actually ping service URLs
6. **Real-time Updates** - WebSocket for live service status
7. **Audit Log** - Track who created/modified/deleted services
8. **Service Dependencies** - Link related services

## Notes

- All operations require valid JWT token
- API must return proper response codes (200, 201, 204, 400, 404, 500)
- DataService handles all API communication
- NotificationService shows all user feedback
- ConfirmationService provides delete confirmation
- Modal prevents accidental backdrop clicks (stopPropagation)
