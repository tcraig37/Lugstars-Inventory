# Lugstars Inventory Management App

A React Native Expo application for managing 3D printing inventory, component tracking, and product assembly.

## Features

- **Component Management**: Track 3D printed components and purchased components
- **Post-Processing Tracking**: Monitor completion status of 3D printed parts
- **Part Assembly**: Assemble parts from components with automatic inventory consumption
- **Product Creation**: Create complete products from assembled parts and components
- **Inventory Dashboard**: Overview of production capacity and inventory status
- **Data Backup/Restore**: Export and import inventory data
- **Over The Air Updates**: Update the app without reinstalling

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device

### Installation

1. Clone this repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```

### Running the App

1. Start the Expo development server:
   ```
   npm start
   ```

2. Scan the QR code with Expo Go on your mobile device

### Setting up EAS for OTA Updates

1. Install EAS CLI:
   ```
   npm install -g eas-cli
   ```

2. Login to your Expo account:
   ```
   eas login
   ```

3. Configure your project:
   ```
   eas build:configure
   ```

4. Update the `app.json` file with your project ID and owner information

5. Build your app:
   ```
   eas build --platform android --profile preview
   ```

6. After building, you can push updates:
   ```
   eas update --channel preview
   ```

## App Structure

### Components
- **3D Printed Components**: Track quantity, post-processing status
- **Purchased Components**: Track inventory of screws, nuts, etc.

### Parts
- **Bowler**: Assembled from multiple 3D components and hardware
- **Batter**: Complex assembly with multiple components

### Products
- **Complete Cricket Set**: Full product assembled from parts and components

## Data Model

The app uses SQLite for local data storage with the following main entities:
- `components_3d`: 3D printed components with post-processing tracking
- `purchased_components`: Bought components like screws, nuts, etc.
- `parts`: Assembled parts made from components
- `products`: Final products made from parts and components
- `part_recipes`: Defines what components are needed for each part
- `product_recipes`: Defines what parts are needed for each product

## Features in Detail

### Component Tracking
- Track raw 3D printed quantities
- Monitor post-processing completion
- Manage purchased component inventory

### Assembly System
- Parts consume components when assembled
- Products consume parts and remaining components
- Automatic inventory deduction
- Production capacity calculation

### Data Management
- Export data as JSON backup
- Import data from backup files
- Reset functionality for testing

## Customization

To modify the component definitions, edit the constants in `types/inventory.ts`:
- `COMPONENT_3D_DEFINITIONS`: Define your 3D printed parts
- `PURCHASED_COMPONENT_DEFINITIONS`: Define purchased components
- `PART_DEFINITIONS`: Define assembly recipes for parts
- `PRODUCT_DEFINITIONS`: Define what goes into final products

## License

This project is private and proprietary to Lugstars.
