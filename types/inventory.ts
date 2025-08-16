// Database Models
export interface Component3D {
  id: number;
  name: string;
  quantity: number;
  postProcessingCompleted: number;
  postProcessingPending: number;
  type: '3d_component';
}

export interface PurchasedComponent {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  type: 'purchased_component';
}

export interface Part {
  id: number;
  name: string;
  quantity: number;
  assembled: number;
  pending: number;
  type: 'part';
}

export interface Product {
  id: number;
  name: string;
  quantity: number;
  type: 'product';
}

export interface PartRecipe {
  id: number;
  partId: number;
  componentId: number;
  componentType: '3d_component' | 'purchased_component';
  quantityRequired: number;
}

export interface ProductRecipe {
  id: number;
  productId: number;
  partId: number;
  quantityRequired: number;
}

// Component definitions based on your requirements
export const COMPONENT_3D_DEFINITIONS = {
  // Full Parts (requiring post-processing only)
  'Fence Corner': { perProduct: 6 },
  'Fence Straight': { perProduct: 4 },
  'Fence Player': { perProduct: 2 },
  'Fielder High': { perProduct: 3 },
  'Fielder Medium': { perProduct: 3 },
  'Fielder Low': { perProduct: 3 },
  'Stumps': { perProduct: 1 },
  
  // Bowler Parts
  'Bowler Gantry': { perProduct: 1 },
  'Bowler Floor': { perProduct: 1 },
  'Bowler Arm': { perProduct: 1 },
  'Bowler Chute': { perProduct: 1 },
  
  // Batter Parts
  'Batter Gantry': { perProduct: 1 },
  'Batter Handle': { perProduct: 1 },
  'Batter Lid': { perProduct: 1 },
  'Batter Cap': { perProduct: 1 },
  'Batter Body': { perProduct: 1 },
  'Batter Slider': { perProduct: 1 },
  'Batter Button Left': { perProduct: 1 },
  'Batter Button Right': { perProduct: 1 },
  'Batter Floor': { perProduct: 1 },
  'Batter Hook': { perProduct: 1 },
  'Batter Bat': { perProduct: 1 },
};

export const PURCHASED_COMPONENT_DEFINITIONS = {
  '6mm M2 Screws': { unit: 'pieces' },
  '8mm M2 Screws': { unit: 'pieces' },
  '12mm M2 Screws': { unit: 'pieces' },
  'M2 nuts': { unit: 'pieces' },
  '8mm M3 Chicago Screws': { unit: 'pieces' },
  '18mm M3 Chicago Screws': { unit: 'pieces' },
  'M3 Chicago Screw Cap': { unit: 'pieces' },
  '1x10mm dowel pins': { unit: 'pieces' },
  '0.4g Split Shot': { unit: 'pieces' },
  'Silk Printed Felt Sheets (pre-cut)': { unit: 'pieces' },
  '30cmx10cm Printed Cardboard Tube': { unit: 'pieces' },
  'Bubble Mailers': { unit: 'pieces' },
  'Packing Tape': { unit: 'rolls' },
  'Balls (3 varieties)': { unit: 'sets' },
  '12cmx34cm self adhesive bags': { unit: 'pieces' },
  'Velcro strips': { unit: 'pieces' },
  'PLA filament (white)': { unit: 'kg' },
  'PLA filament (black)': { unit: 'kg' },
  'PLA filament (beige)': { unit: 'kg' },
  'String': { unit: 'pieces' },
  'String Ball': { unit: 'pieces' },
  'A4 Paper': { unit: 'sheets' },
};

export const PART_DEFINITIONS = {
  'Bowler': {
    components3D: [
      { name: 'Bowler Gantry', quantity: 1 },
      { name: 'Bowler Floor', quantity: 1 },
      { name: 'Bowler Arm', quantity: 1 },
      { name: 'Bowler Chute', quantity: 1 },
    ],
    purchasedComponents: [
      { name: '1x10mm dowel pins', quantity: 1 },
      { name: '8mm M3 Chicago Screws', quantity: 1 },
      { name: 'M3 Chicago Screw Cap', quantity: 1 },
    ],
  },
  'Batter': {
    components3D: [
      { name: 'Batter Gantry', quantity: 1 },
      { name: 'Batter Handle', quantity: 1 },
      { name: 'Batter Lid', quantity: 1 },
      { name: 'Batter Cap', quantity: 1 },
      { name: 'Batter Body', quantity: 1 },
      { name: 'Batter Slider', quantity: 1 },
      { name: 'Batter Button Left', quantity: 1 },
      { name: 'Batter Button Right', quantity: 1 },
      { name: 'Batter Floor', quantity: 1 },
      { name: 'Batter Hook', quantity: 1 },
      { name: 'Batter Bat', quantity: 1 },
    ],
    purchasedComponents: [
      { name: '18mm M3 Chicago Screws', quantity: 1 },
      { name: 'M3 Chicago Screw Cap', quantity: 1 },
      { name: '6mm M2 Screws', quantity: 2 },
      { name: '8mm M2 Screws', quantity: 1 },
      { name: '12mm M2 Screws', quantity: 1 },
      { name: 'M2 nuts', quantity: 4 },
      { name: '0.4g Split Shot', quantity: 3 },
      { name: 'String', quantity: 1 },
      { name: 'String Ball', quantity: 1 },
    ],
  },
};

export const PRODUCT_DEFINITIONS = {
  'Complete Cricket Set': {
    fullParts: [
      { name: 'Fence Corner', quantity: 6 },
      { name: 'Fence Straight', quantity: 4 },
      { name: 'Fence Player', quantity: 2 },
      { name: 'Fielder High', quantity: 3 },
      { name: 'Fielder Medium', quantity: 3 },
      { name: 'Fielder Low', quantity: 3 },
      { name: 'Stumps', quantity: 1 },
    ],
    assembledParts: [
      { name: 'Bowler', quantity: 1 },
      { name: 'Batter', quantity: 1 },
    ],
    directComponents: [
      { name: 'Balls (3 varieties)', quantity: 1 },
      { name: 'Silk Printed Felt Sheets (pre-cut)', quantity: 1 },
      { name: '30cmx10cm Printed Cardboard Tube', quantity: 1 },
      { name: 'Bubble Mailers', quantity: 0.5 },
      { name: '12cmx34cm self adhesive bags', quantity: 1 },
      { name: 'Velcro strips', quantity: 1 },
      { name: 'A4 Paper', quantity: 1 },
    ],
  },
};
