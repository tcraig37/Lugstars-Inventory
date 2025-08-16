import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { 
  Component3D, 
  PurchasedComponent, 
  Part, 
  Product, 
  PartRecipe, 
  ProductRecipe,
  COMPONENT_3D_DEFINITIONS,
  PURCHASED_COMPONENT_DEFINITIONS,
  PART_DEFINITIONS,
  PRODUCT_DEFINITIONS
} from '../types/inventory';

class DatabaseServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;

  async initializeDatabase() {
    try {
      this.db = await SQLite.openDatabaseAsync('inventory.db');
      await this.createTables();
      await this.seedInitialData();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private async createTables() {
    if (!this.db) return;

    const createTables = `
      CREATE TABLE IF NOT EXISTS components_3d (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        post_processing_completed INTEGER DEFAULT 0,
        post_processing_pending INTEGER DEFAULT 0,
        type TEXT DEFAULT '3d_component'
      );

      CREATE TABLE IF NOT EXISTS purchased_components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit TEXT NOT NULL,
        type TEXT DEFAULT 'purchased_component'
      );

      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        assembled INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0,
        type TEXT DEFAULT 'part'
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        type TEXT DEFAULT 'product'
      );

      CREATE TABLE IF NOT EXISTS part_recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_id INTEGER NOT NULL,
        component_id INTEGER NOT NULL,
        component_type TEXT NOT NULL,
        quantity_required INTEGER NOT NULL,
        FOREIGN KEY (part_id) REFERENCES parts (id),
        UNIQUE(part_id, component_id, component_type)
      );

      CREATE TABLE IF NOT EXISTS product_recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        part_id INTEGER NOT NULL,
        quantity_required INTEGER NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (part_id) REFERENCES parts (id),
        UNIQUE(product_id, part_id)
      );
    `;

    await this.db.execAsync(createTables);
  }

  private async seedInitialData() {
    if (!this.db) return;

    // Check if data already exists
    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM components_3d');
    if (result && (result as any).count > 0) return;

    // Seed 3D components
    for (const [name] of Object.entries(COMPONENT_3D_DEFINITIONS)) {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO components_3d (name, quantity, post_processing_completed, post_processing_pending) VALUES (?, 0, 0, 0)',
        [name]
      );
    }

    // Seed purchased components
    for (const [name, config] of Object.entries(PURCHASED_COMPONENT_DEFINITIONS)) {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO purchased_components (name, quantity, unit) VALUES (?, 0, ?)',
        [name, config.unit]
      );
    }

    // Seed parts
    for (const [name] of Object.entries(PART_DEFINITIONS)) {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO parts (name, quantity, assembled, pending) VALUES (?, 0, 0, 0)',
        [name]
      );
    }

    // Seed products
    for (const [name] of Object.entries(PRODUCT_DEFINITIONS)) {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO products (name, quantity) VALUES (?, 0)',
        [name]
      );
    }

    // Seed part recipes
    for (const [partName, recipe] of Object.entries(PART_DEFINITIONS)) {
      const part = await this.db.getFirstAsync('SELECT id FROM parts WHERE name = ?', [partName]);
      if (!part) continue;

      const partId = (part as any).id;

      // Add 3D components to recipe
      for (const component of recipe.components3D) {
        const comp = await this.db.getFirstAsync('SELECT id FROM components_3d WHERE name = ?', [component.name]);
        if (comp) {
          await this.db.runAsync(
            'INSERT OR IGNORE INTO part_recipes (part_id, component_id, component_type, quantity_required) VALUES (?, ?, ?, ?)',
            [partId, (comp as any).id, '3d_component', component.quantity]
          );
        }
      }

      // Add purchased components to recipe
      for (const component of recipe.purchasedComponents) {
        const comp = await this.db.getFirstAsync('SELECT id FROM purchased_components WHERE name = ?', [component.name]);
        if (comp) {
          await this.db.runAsync(
            'INSERT OR IGNORE INTO part_recipes (part_id, component_id, component_type, quantity_required) VALUES (?, ?, ?, ?)',
            [partId, (comp as any).id, 'purchased_component', component.quantity]
          );
        }
      }
    }

    console.log('Initial data seeded successfully');
  }

  // CRUD Operations for 3D Components
  async getComponents3D(): Promise<Component3D[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM components_3d ORDER BY name');
    return result.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      quantity: (row as any).quantity,
      postProcessingCompleted: (row as any).post_processing_completed,
      postProcessingPending: (row as any).post_processing_pending,
      type: '3d_component' as const
    }));
  }

  async updateComponent3D(id: number, updates: Partial<Component3D>) {
    if (!this.db) return;
    
    const setClause = [];
    const values = [];
    
    if (updates.quantity !== undefined) {
      setClause.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.postProcessingCompleted !== undefined) {
      setClause.push('post_processing_completed = ?');
      values.push(updates.postProcessingCompleted);
    }
    if (updates.postProcessingPending !== undefined) {
      setClause.push('post_processing_pending = ?');
      values.push(updates.postProcessingPending);
    }
    
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE components_3d SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );
  }

  // CRUD Operations for Purchased Components
  async getPurchasedComponents(): Promise<PurchasedComponent[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM purchased_components ORDER BY name');
    return result.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      quantity: (row as any).quantity,
      unit: (row as any).unit,
      type: 'purchased_component' as const
    }));
  }

  async updatePurchasedComponent(id: number, quantity: number) {
    if (!this.db) return;
    await this.db.runAsync('UPDATE purchased_components SET quantity = ? WHERE id = ?', [quantity, id]);
  }

  // CRUD Operations for Parts
  async getParts(): Promise<Part[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM parts ORDER BY name');
    return result.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      quantity: (row as any).quantity,
      assembled: (row as any).assembled,
      pending: (row as any).pending,
      type: 'part' as const
    }));
  }

  async updatePart(id: number, updates: Partial<Part>) {
    if (!this.db) return;
    
    const setClause = [];
    const values = [];
    
    if (updates.quantity !== undefined) {
      setClause.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.assembled !== undefined) {
      setClause.push('assembled = ?');
      values.push(updates.assembled);
    }
    if (updates.pending !== undefined) {
      setClause.push('pending = ?');
      values.push(updates.pending);
    }
    
    values.push(id);
    
    await this.db.runAsync(
      `UPDATE parts SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Operations for Products
  async getProducts(): Promise<Product[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM products ORDER BY name');
    return result.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      quantity: (row as any).quantity,
      type: 'product' as const
    }));
  }

  async updateProduct(id: number, quantity: number) {
    if (!this.db) return;
    await this.db.runAsync('UPDATE products SET quantity = ? WHERE id = ?', [quantity, id]);
  }

  // Assembly operations
  async assemblePart(partId: number, quantity: number = 1) {
    if (!this.db) return { success: false, message: 'Database not initialized' };

    try {
      // Get part recipe
      const recipe = await this.db.getAllAsync(`
        SELECT pr.component_id, pr.component_type, pr.quantity_required
        FROM part_recipes pr
        WHERE pr.part_id = ?
      `, [partId]);

      // Check if we have enough components
      for (const item of recipe) {
        const requiredQty = (item as any).quantity_required * quantity;
        
        if ((item as any).component_type === '3d_component') {
          const component = await this.db.getFirstAsync(
            'SELECT post_processing_completed FROM components_3d WHERE id = ?',
            [(item as any).component_id]
          );
          if (!component || (component as any).post_processing_completed < requiredQty) {
            return { success: false, message: 'Insufficient 3D components available' };
          }
        } else {
          const component = await this.db.getFirstAsync(
            'SELECT quantity FROM purchased_components WHERE id = ?',
            [(item as any).component_id]
          );
          if (!component || (component as any).quantity < requiredQty) {
            return { success: false, message: 'Insufficient purchased components available' };
          }
        }
      }

      // Consume components and create part
      for (const item of recipe) {
        const requiredQty = (item as any).quantity_required * quantity;
        
        if ((item as any).component_type === '3d_component') {
          await this.db.runAsync(
            'UPDATE components_3d SET post_processing_completed = post_processing_completed - ? WHERE id = ?',
            [requiredQty, (item as any).component_id]
          );
        } else {
          await this.db.runAsync(
            'UPDATE purchased_components SET quantity = quantity - ? WHERE id = ?',
            [requiredQty, (item as any).component_id]
          );
        }
      }

      // Update part quantity
      await this.db.runAsync(
        'UPDATE parts SET assembled = assembled + ? WHERE id = ?',
        [quantity, partId]
      );

      return { success: true, message: `Successfully assembled ${quantity} part(s)` };
    } catch (error) {
      console.error('Error assembling part:', error);
      return { success: false, message: 'Failed to assemble part' };
    }
  }

  // Backup and Restore
  async exportData(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const data = {
      components3d: await this.getComponents3D(),
      purchasedComponents: await this.getPurchasedComponents(),
      parts: await this.getParts(),
      products: await this.getProducts(),
      exportDate: new Date().toISOString()
    };

    const jsonString = JSON.stringify(data, null, 2);
    const filename = `lugstars_inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.writeAsStringAsync(fileUri, jsonString);
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
    
    return fileUri;
  }

  async importData(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.canceled) {
        return { success: false, message: 'Import cancelled' };
      }

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const data = JSON.parse(fileContent);

      // Validate data structure
      if (!data.components3d || !data.purchasedComponents || !data.parts || !data.products) {
        return { success: false, message: 'Invalid backup file format' };
      }

      // Import data
      for (const component of data.components3d) {
        await this.updateComponent3D(component.id, component);
      }

      for (const component of data.purchasedComponents) {
        await this.updatePurchasedComponent(component.id, component.quantity);
      }

      for (const part of data.parts) {
        await this.updatePart(part.id, part);
      }

      for (const product of data.products) {
        await this.updateProduct(product.id, product.quantity);
      }

      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, message: 'Failed to import data' };
    }
  }
}

export const DatabaseService = new DatabaseServiceClass();
