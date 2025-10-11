# Collapsible Parameters Details Feature

## Overview
Added collapsible/expandable functionality to the Parameters Details section in Agent Responses to improve UI/UX when dealing with multiple parameters.

## Implementation

### TypeScript Changes (`service-detail.ts`)

#### 1. New Signal for Tracking Expanded State
```typescript
expandedParameters = signal<Set<number>>(new Set());
```
- Uses a `Set<number>` to track which agent response indices have expanded parameters
- Signal ensures reactive updates when state changes

#### 2. Toggle Method
```typescript
toggleParametersExpanded(index: number) {
  const expanded = new Set(this.expandedParameters());
  if (expanded.has(index)) {
    expanded.delete(index);
  } else {
    expanded.add(index);
  }
  this.expandedParameters.set(expanded);
}
```
- Creates a new Set to maintain immutability
- Adds or removes the index based on current state
- Updates the signal to trigger UI updates

#### 3. Check Method
```typescript
isParametersExpanded(index: number): boolean {
  return this.expandedParameters().has(index);
}
```
- Returns whether a specific agent response's parameters are expanded
- Used in template for conditional rendering and styling

### HTML Changes (`service-detail.html`)

#### Collapsible Header
```html
<div 
  (click)="toggleParametersExpanded($index)" 
  style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 8px 12px; margin: 0 -12px 12px -12px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); transition: background 0.2s;"
  [style.background]="isParametersExpanded($index) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)'"
>
```

**Features:**
- Clickable header with hover effect
- Dynamic background color based on expanded state
- Smooth transition (0.2s) for background changes
- Negative margins to extend to card edges

#### Header Content
```html
<h3 style="font-size: 14px; font-weight: 600; color: var(--muted); margin: 0; display: flex; align-items: center; gap: 8px;">
  <svg 
    width="16" 
    height="16" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    style="transition: transform 0.2s;"
    [style.transform]="isParametersExpanded($index) ? 'rotate(90deg)' : 'rotate(0deg)'"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
  </svg>
  Parameters Details
  <span style="display: inline-block; background: rgba(255, 255, 255, 0.1); padding: 2px 8px; border-radius: 12px; font-size: 11px;">
    {{ agentResponse.parametersDetails.length }}
  </span>
</h3>
<span style="font-size: 12px; color: var(--muted); opacity: 0.7;">
  {{ isParametersExpanded($index) ? 'Click to collapse' : 'Click to expand' }}
</span>
```

**Elements:**
1. **Chevron Icon**: Rotates 90° when expanded (right → down)
2. **Title**: "Parameters Details" with clear labeling
3. **Badge**: Shows count of parameter groups
4. **Hint Text**: Changes between "Click to expand" / "Click to collapse"

#### Conditional Content Rendering
```html
@if (isParametersExpanded($index)) {
  @for (param of agentResponse.parametersDetails; track param.name) {
    <!-- Parameter tables here -->
  }
}
```
- Only renders parameter tables when expanded
- Improves performance by not rendering hidden content
- Uses Angular's control flow syntax

## Visual Design

### Collapsed State
```
┌─────────────────────────────────────────────────────┐
│ ▶ Parameters Details [3]       Click to expand      │
└─────────────────────────────────────────────────────┘
```

### Expanded State
```
┌─────────────────────────────────────────────────────┐
│ ▼ Parameters Details [3]      Click to collapse     │
│                                                      │
│ ┌─ Parameter Group 1 ──────────────────────────┐   │
│ │ Key          Value                            │   │
│ │ param1       value1                           │   │
│ │ param2       value2                           │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ Parameter Group 2 ──────────────────────────┐   │
│ │ ...                                           │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Styling Details

### Interactive States
- **Default**: Light background `rgba(255, 255, 255, 0.03)`
- **Expanded**: Slightly brighter `rgba(255, 255, 255, 0.05)`
- **Hover**: Automatically handled by browser with cursor pointer
- **Transition**: 0.2s smooth transition for all state changes

### Icon Animation
- **Collapsed**: Chevron points right (0deg)
- **Expanded**: Chevron points down (90deg)
- **Transition**: 0.2s smooth rotation

### Typography
- **Header**: 14px, font-weight 600, muted color
- **Badge**: 11px, light background with rounded corners
- **Hint**: 12px, muted color with 70% opacity

## Benefits

1. **Reduced Clutter**: Parameters hidden by default, clean interface
2. **Better UX**: Users can focus on what they need
3. **Performance**: Conditional rendering reduces DOM nodes
4. **Accessibility**: Clear visual indicators (chevron, text hints)
5. **Responsive**: Smooth animations provide feedback
6. **Scalable**: Works well with any number of parameter groups

## Usage

### For Users
1. Each Agent Response card has a "Parameters Details" section
2. Click the header to expand/collapse the parameters
3. Chevron icon rotates to indicate state
4. Text hint shows current action available
5. Each card's state is independent

### For Developers
```typescript
// Check if parameters are expanded
if (this.isParametersExpanded(index)) {
  // Do something
}

// Programmatically toggle
this.toggleParametersExpanded(index);

// Expand all (example)
const allIndices = new Set(this.paginatedAgentResponses().map((_, i) => i));
this.expandedParameters.set(allIndices);

// Collapse all
this.expandedParameters.set(new Set());
```

## Future Enhancements

- [ ] Add "Expand All" / "Collapse All" button
- [ ] Remember expanded state in localStorage
- [ ] Add keyboard navigation (Space/Enter to toggle)
- [ ] Add animation for content slide-in/out
- [ ] Make Cache Keys and Cache Result collapsible too
- [ ] Add URL parameter to deep-link to expanded state

## Testing Checklist

- [x] Click header toggles expanded state
- [x] Chevron rotates correctly
- [x] Hint text updates properly
- [x] Background color changes on expand/collapse
- [x] Each card's state is independent
- [x] Content only renders when expanded
- [x] Smooth transitions work
- [x] Works with pagination (state resets on page change)
- [x] No TypeScript compilation errors
