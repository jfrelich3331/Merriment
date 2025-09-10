# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static web application for Merriment Business Financial Dashboard - a business planning tool that helps calculate revenue scenarios and capacity planning for ABA (Applied Behavior Analysis) therapy services.

## Architecture

### Frontend Structure
- **index.html** - Main dashboard interface with dual modes (Capacity Mode and Sales Mode)
- **script.js** - Core application logic with financial calculations and DOM manipulation
- **style.css** - Responsive dashboard styling with gradient backgrounds and modern UI components

### Key Components

1. **Dashboard Modes**:
   - Capacity Mode: Focuses on hourly capacity utilization and growth scenarios
   - Sales Mode: Emphasizes package sales and revenue projections

2. **Core Data Models**:
   - Service types: parent training, direct therapy, respite care
   - Package configurations: Starter, Support, Parent Support, Intensive
   - Employee scenarios with configurable hourly rates and billable percentages

3. **Financial Calculations**:
   - Hourly rate calculations based on service types (script.js:85-95)
   - Package revenue with discount applications (script.js:12-60)
   - Growth scenario projections with W2/Merriment income splits
   - Employee impact analysis with ROI calculations

### JavaScript Architecture

The application has been refactored to use modern object-oriented patterns with clear separation of concerns:

- **State Management**: Centralized `AppState` class with reactive updates (script.js:8-45)
- **Business Logic**: `BusinessCalculator` class handles all financial calculations (script.js:80-140)
- **Component System**: Reusable UI components (`MetricsGrid`, `PackageGrid`, `GrowthScenariosTable`) (script.js:240-470)  
- **Template System**: `Templates` class for consistent HTML generation (script.js:140-200)
- **Error Handling**: Global `ErrorHandler` class reduces try-catch repetition (script.js:60-75)
- **DOM Caching**: `DOMCache` class optimizes element selection performance (script.js:47-58)
- **Controller**: `DashboardController` coordinates all components and handles events (script.js:510-745)

## Development

### Running the Application
Since this is a static website, simply open `index.html` in a web browser or serve it with any static file server:

```bash
python -m http.server 8000
# or
npx serve .
```

### File Dependencies
- jQuery 3.6.0 (loaded from CDN)
- All assets are self-contained (no build process required)

### Key Classes and Methods
- `AppState.setState()` - Triggers reactive updates across all components
- `BusinessCalculator.calculatePackageRevenue()` - Core revenue calculation logic
- `BusinessCalculator.calculateEffectiveRate()` - Hourly rate calculations based on service mix
- `DashboardController.updateAllComponents()` - Coordinates UI updates
- `Component.render()` - Base class method for UI rendering
- `Templates.*` - Static methods for HTML generation

### Architectural Benefits
- **Maintainability**: Clear separation between business logic, UI components, and state
- **Testability**: Pure functions in BusinessCalculator are easy to unit test
- **Performance**: DOM caching and reactive updates minimize unnecessary re-renders
- **Extensibility**: New components can be added by extending the Component base class

No build tools, package managers, or testing frameworks are currently configured for this project.