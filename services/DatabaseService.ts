// Temporarily testing SQLite compatibility
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
  PrintPriority,
  PostProcessingTask,
  AssemblyTask,
  COMPONENT_3D_DEFINITIONS,
  PURCHASED_COMPONENT_DEFINITIONS,
  PART_DEFINITIONS,
  PRODUCT_DEFINITIONS
} from '../types/inventory';

class DatabaseServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;
  private initializationPromise: Promise<void> | null = null;

  async initializeDatabase() {
    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // If database is already initialized, return
    if (this.db) {
      return Promise.resolve();
    }

    // Start initialization
    this.initializationPromise = this.doInitialization();
    return this.initializationPromise;
  }

  private async doInitialization() {
    try {
      console.log('Initializing Lugstars Inventory Database...');
      this.db = await SQLite.openDatabaseAsync('inventory.db');
      console.log('✅ SQLite database opened successfully!');
      
      await this.createTables();
      await this.migrateTables(); // Always run migration to ensure columns exist
      await this.seedInitialData();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.db = null;
      this.initializationPromise = null;
      throw error;
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
        batch_size INTEGER DEFAULT 10,
        print_time_minutes INTEGER DEFAULT 60,
        requires_post_processing BOOLEAN DEFAULT TRUE,
        type TEXT DEFAULT '3d_component'
      );

      CREATE TABLE IF NOT EXISTS purchased_components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit TEXT NOT NULL,
        low_stock_threshold REAL DEFAULT NULL,
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

      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.execAsync(createTables);

    // Add missing columns to existing tables if they don't exist
    await this.migrateTables();
  }

  private async migrateTables() {
    if (!this.db) return;

    try {
      // Check if batch_size column exists in components_3d
      const tableInfo = await this.db.getAllAsync('PRAGMA table_info(components_3d)');
      const columns = (tableInfo as any[]).map(row => row.name);
      
      console.log('Existing columns in components_3d:', columns);

      if (!columns.includes('batch_size')) {
        console.log('Adding batch_size column...');
        await this.db.execAsync('ALTER TABLE components_3d ADD COLUMN batch_size INTEGER DEFAULT 10');
      }

      if (!columns.includes('print_time_minutes')) {
        console.log('Adding print_time_minutes column...');
        await this.db.execAsync('ALTER TABLE components_3d ADD COLUMN print_time_minutes INTEGER DEFAULT 60');
      }

      if (!columns.includes('requires_post_processing')) {
        console.log('Adding requires_post_processing column...');
        await this.db.execAsync('ALTER TABLE components_3d ADD COLUMN requires_post_processing BOOLEAN DEFAULT TRUE');
      }

      // Check if low_stock_threshold column exists in purchased_components
      const purchasedTableInfo = await this.db.getAllAsync('PRAGMA table_info(purchased_components)');
      const purchasedColumns = (purchasedTableInfo as any[]).map(row => row.name);
      
      console.log('Existing columns in purchased_components:', purchasedColumns);

      if (!purchasedColumns.includes('low_stock_threshold')) {
        console.log('Adding low_stock_threshold column...');
        await this.db.execAsync('ALTER TABLE purchased_components ADD COLUMN low_stock_threshold REAL DEFAULT NULL');
      }

      console.log('Table migration completed');
    } catch (error) {
      console.error('Migration error:', error);
    }
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

  private async ensureDatabase() {
    if (!this.db) {
      await this.initializeDatabase();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
  }

  // CRUD Operations for 3D Components
  async getComponents3D(): Promise<Component3D[]> {
    await this.ensureDatabase();
    
    const result = await this.db!.getAllAsync('SELECT * FROM components_3d ORDER BY name');
    
    return result.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      quantity: (row as any).quantity,
      postProcessingCompleted: (row as any).post_processing_completed,
      postProcessingPending: (row as any).post_processing_pending,
      batchSize: (row as any).batch_size || 10,
      printTimeMinutes: (row as any).print_time_minutes || 60,
      requiresPostProcessing: (row as any).requires_post_processing !== 0,
      type: '3d_component' as const
    }));
  }

  async updateComponent3D(id: number, updates: Partial<Component3D>) {
    await this.ensureDatabase();
    
    console.log('Updating component 3D:', { id, updates });
    
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
    if (updates.batchSize !== undefined) {
      setClause.push('batch_size = ?');
      values.push(updates.batchSize);
    }
    if (updates.printTimeMinutes !== undefined) {
      setClause.push('print_time_minutes = ?');
      values.push(updates.printTimeMinutes);
    }
    if (updates.requiresPostProcessing !== undefined) {
      setClause.push('requires_post_processing = ?');
      values.push(updates.requiresPostProcessing ? 1 : 0);
    }
    
    if (setClause.length === 0) {
      console.warn('No fields to update');
      return;
    }
    
    values.push(id);
    
    const query = `UPDATE components_3d SET ${setClause.join(', ')} WHERE id = ?`;
    console.log('Executing SQL:', query, values);
    
    try {
      await this.db!.runAsync(query, values);
      console.log('Component 3D updated successfully');
    } catch (error) {
      console.error('Failed to update component 3D:', error);
      throw error;
    }
  }

  // CRUD Operations for Purchased Components
  async getPurchasedComponents(): Promise<PurchasedComponent[]> {
    await this.ensureDatabase();
    const result = await this.db!.getAllAsync('SELECT * FROM purchased_components ORDER BY name');
    return result.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      quantity: (row as any).quantity,
      unit: (row as any).unit,
      lowStockThreshold: (row as any).low_stock_threshold,
      type: 'purchased_component' as const
    }));
  }

  async updatePurchasedComponent(id: number, updates: { quantity?: number; lowStockThreshold?: number | null }) {
    await this.ensureDatabase();
    
    const setClause = [];
    const values = [];
    
    if (updates.quantity !== undefined) {
      setClause.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.lowStockThreshold !== undefined) {
      setClause.push('low_stock_threshold = ?');
      values.push(updates.lowStockThreshold);
    }
    
    if (setClause.length === 0) return;
    
    values.push(id);
    await this.db!.runAsync(
      `UPDATE purchased_components SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );
  }

  // CRUD Operations for Parts
  async getParts(): Promise<Part[]> {
    await this.ensureDatabase();
    
    // Get parts with calculated quantities
    const result = await this.db!.getAllAsync(`
      SELECT 
        p.*,
        COALESCE(
          (SELECT SUM(pr.quantity_required) 
           FROM product_recipes pr 
           JOIN products prod ON pr.product_id = prod.id 
           WHERE pr.part_id = p.id), 0
        ) as used_in_products
      FROM parts p 
      ORDER BY p.name
    `);
    
    return result.map(row => ({
      id: (row as any).id,
      name: (row as any).name,
      quantity: Math.max(0, (row as any).assembled - (row as any).used_in_products), // Available = assembled - used
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
    await this.ensureDatabase();
    const result = await this.db!.getAllAsync('SELECT * FROM products ORDER BY name');
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

  // Print Planning and Priority Calculations
  async calculatePrintPriorities(targetProducts: number = 10): Promise<PrintPriority[]> {
    if (!this.db) return [];
    
    try {
      // Get all component requirements for target number of products
      const componentRequirements = await this.db.getAllAsync(`
        SELECT 
          c.id,
          c.name,
          c.post_processing_completed as current_stock,
          c.batch_size,
          c.print_time_minutes,
          SUM(pr.quantity_required * ?) as total_needed
        FROM components_3d c
        LEFT JOIN part_recipes pr ON c.id = pr.component_id AND pr.component_type = '3d_component'
        LEFT JOIN parts p ON pr.part_id = p.id
        GROUP BY c.id, c.name, c.post_processing_completed, c.batch_size, c.print_time_minutes
        HAVING total_needed > 0
      `, [targetProducts]);

      const priorities: PrintPriority[] = [];

      for (const req of componentRequirements) {
        const current = (req as any).current_stock || 0;
        const needed = (req as any).total_needed || 0;
        const shortage = Math.max(0, needed - current);
        const batchSize = (req as any).batch_size || 10;
        const printTime = (req as any).print_time_minutes || 60;
        
        if (shortage > 0) {
          const batchesNeeded = Math.ceil(shortage / batchSize);
          const totalPrintTime = batchesNeeded * printTime;
          
          let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
          if (current === 0) priority = 'critical';
          else if (shortage >= needed * 0.8) priority = 'high';
          else if (shortage >= needed * 0.5) priority = 'medium';

          priorities.push({
            componentId: (req as any).id,
            componentName: (req as any).name,
            currentStock: current,
            needed,
            shortage,
            batchSize,
            batchesNeeded,
            printTimeMinutes: printTime,
            totalPrintTime,
            priority
          });
        }
      }

      // Sort by priority (critical first, then by shortage amount)
      return priorities.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.shortage - a.shortage;
      });

    } catch (error) {
      console.error('Error calculating print priorities:', error);
      return [];
    }
  }

  // Assembly operations
  async assemblePart(partId: number, quantity: number = 1) {
    if (!this.db) return { success: false, message: 'Database not initialized' };

    try {
      console.log(`🔧 Attempting to assemble ${quantity} part(s) with ID ${partId}`);
      
      // Get part recipe
      const recipe = await this.db.getAllAsync(`
        SELECT pr.component_id, pr.component_type, pr.quantity_required, 
               CASE 
                 WHEN pr.component_type = '3d_component' THEN c3d.name
                 ELSE pc.name 
               END as component_name
        FROM part_recipes pr
        LEFT JOIN components_3d c3d ON pr.component_id = c3d.id AND pr.component_type = '3d_component'
        LEFT JOIN purchased_components pc ON pr.component_id = pc.id AND pr.component_type = 'purchased_component'
        WHERE pr.part_id = ?
      `, [partId]);

      console.log(`📋 Recipe found: ${recipe.length} components required`);
      recipe.forEach((item: any) => {
        console.log(`  - ${item.component_name}: ${item.quantity_required} x ${quantity} = ${item.quantity_required * quantity} needed`);
      });

      // Check if we have enough components
      for (const item of recipe) {
        const requiredQty = (item as any).quantity_required * quantity;
        
        if ((item as any).component_type === '3d_component') {
          const component = await this.db.getFirstAsync(
            'SELECT post_processing_completed FROM components_3d WHERE id = ?',
            [(item as any).component_id]
          );
          console.log(`📦 3D Component ${(item as any).component_name}: Available=${(component as any)?.post_processing_completed || 0}, Required=${requiredQty}`);
          if (!component || (component as any).post_processing_completed < requiredQty) {
            return { success: false, message: `Insufficient 3D components: ${(item as any).component_name} (need ${requiredQty}, have ${(component as any)?.post_processing_completed || 0})` };
          }
        } else {
          const component = await this.db.getFirstAsync(
            'SELECT quantity FROM purchased_components WHERE id = ?',
            [(item as any).component_id]
          );
          console.log(`🛒 Purchased Component ${(item as any).component_name}: Available=${(component as any)?.quantity || 0}, Required=${requiredQty}`);
          if (!component || (component as any).quantity < requiredQty) {
            return { success: false, message: `Insufficient purchased components: ${(item as any).component_name} (need ${requiredQty}, have ${(component as any)?.quantity || 0})` };
          }
        }
      }

      console.log('✅ All components available, proceeding with assembly...');

      // Consume components and create part
      for (const item of recipe) {
        const requiredQty = (item as any).quantity_required * quantity;
        
        if ((item as any).component_type === '3d_component') {
          console.log(`🔥 Consuming ${requiredQty} of 3D component: ${(item as any).component_name}`);
          await this.db.runAsync(
            'UPDATE components_3d SET post_processing_completed = post_processing_completed - ? WHERE id = ?',
            [requiredQty, (item as any).component_id]
          );
        } else {
          console.log(`🔥 Consuming ${requiredQty} of purchased component: ${(item as any).component_name}`);
          await this.db.runAsync(
            'UPDATE purchased_components SET quantity = quantity - ? WHERE id = ?',
            [requiredQty, (item as any).component_id]
          );
        }
      }

      // Update part quantity
      console.log(`📦 Adding ${quantity} assembled part(s)`);
      await this.db.runAsync(
        'UPDATE parts SET assembled = assembled + ? WHERE id = ?',
        [quantity, partId]
      );

      console.log('🎉 Assembly completed successfully!');
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
        await this.updatePurchasedComponent(component.id, { quantity: component.quantity });
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

  // Post-processing and Assembly Management
  async getPostProcessingTasks(): Promise<PostProcessingTask[]> {
    await this.ensureDatabase();
    
    const components = await this.getComponents3D();
    const parts = await this.getParts();
    const products = await this.getProducts();
    
    const tasks: PostProcessingTask[] = [];
    
    // Find components that have printed items waiting for post-processing
    for (const component of components) {
      if (component.requiresPostProcessing && component.postProcessingPending > 0) {
        // Determine urgency based on production needs
        let priority: 'critical' | 'urgent' | 'medium' | 'low' = 'medium';
        let reason = `${component.postProcessingPending} items waiting for post-processing`;
        let blocksProduction = false;
        
        // Check if this component is blocking production
        const bowlerStock = parts.find(p => p.name === 'Bowler')?.quantity || 0;
        const batterStock = parts.find(p => p.name === 'Batter')?.quantity || 0;
        const productCapacity = Math.min(bowlerStock, batterStock);
        
        // If we can't make any products and this component is needed for assembly
        if (productCapacity === 0) {
          if (component.name.includes('Bowler') && bowlerStock === 0) {
            priority = 'critical';
            reason = 'Needed to assemble Bowler part - blocks all production';
            blocksProduction = true;
          } else if (component.name.includes('Batter') && batterStock === 0) {
            priority = 'critical';
            reason = 'Needed to assemble Batter part - blocks all production';
            blocksProduction = true;
          }
        } else if (component.postProcessingCompleted < 10) {
          // If we're running low on processed components
          priority = 'urgent';
          reason = `Low stock after processing (${component.postProcessingCompleted} ready) - ${component.postProcessingPending} waiting`;
        }
        
        tasks.push({
          componentId: component.id,
          componentName: component.name,
          pendingQuantity: component.postProcessingPending,
          priority,
          reason,
          blocksProduction
        });
      }
    }
    
    // Sort by priority (critical first, then urgent, etc.)
    return tasks.sort((a, b) => {
      const priorityOrder = { critical: 0, urgent: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async getAssemblyTasks(): Promise<AssemblyTask[]> {
    await this.ensureDatabase();
    
    const components = await this.getComponents3D();
    const parts = await this.getParts();
    const tasks: AssemblyTask[] = [];
    
    // Check Bowler assembly (exclude Gantry - it's a separate component)
    const bowlerComponents = components.filter(c => c.name.includes('Bowler') && !c.name.includes('Gantry'));
    const bowlerPart = parts.find(p => p.name === 'Bowler');
    const bowlerStock = bowlerPart?.quantity || 0;
    
    const bowlerMissing: string[] = [];
    let bowlerCanAssemble = Number.MAX_SAFE_INTEGER;
    
    for (const component of bowlerComponents) {
      if (component.postProcessingCompleted === 0) {
        bowlerMissing.push(component.name);
      }
      bowlerCanAssemble = Math.min(bowlerCanAssemble, component.postProcessingCompleted);
    }
    
    if (bowlerCanAssemble === Number.MAX_SAFE_INTEGER) bowlerCanAssemble = 0;
    
    tasks.push({
      partName: 'Bowler',
      componentsReady: bowlerMissing.length === 0,
      missingComponents: bowlerMissing,
      canAssemble: bowlerCanAssemble,
      needed: Math.max(1 - bowlerStock, 0),
      urgency: bowlerStock === 0 ? 'critical' : bowlerStock < 3 ? 'urgent' : 'medium',
      reason: bowlerStock === 0 ? 'No Bowler parts - blocks all production' : 
              bowlerStock < 3 ? 'Low Bowler stock' : 'Bowler stock adequate'
    });
    
    // Check Batter assembly (exclude Gantry - it's a separate component)
    const batterComponents = components.filter(c => c.name.includes('Batter') && !c.name.includes('Gantry'));
    const batterPart = parts.find(p => p.name === 'Batter');
    const batterStock = batterPart?.quantity || 0;
    
    const batterMissing: string[] = [];
    let batterCanAssemble = Number.MAX_SAFE_INTEGER;
    
    for (const component of batterComponents) {
      if (component.postProcessingCompleted === 0) {
        batterMissing.push(component.name);
      }
      batterCanAssemble = Math.min(batterCanAssemble, component.postProcessingCompleted);
    }
    
    if (batterCanAssemble === Number.MAX_SAFE_INTEGER) batterCanAssemble = 0;
    
    tasks.push({
      partName: 'Batter',
      componentsReady: batterMissing.length === 0,
      missingComponents: batterMissing,
      canAssemble: batterCanAssemble,
      needed: Math.max(1 - batterStock, 0),
      urgency: batterStock === 0 ? 'critical' : batterStock < 3 ? 'urgent' : 'medium',
      reason: batterStock === 0 ? 'No Batter parts - blocks all production' : 
              batterStock < 3 ? 'Low Batter stock' : 'Batter stock adequate'
    });
    
    // Sort by urgency
    return tasks.sort((a, b) => {
      const priorityOrder = { critical: 0, urgent: 1, medium: 2, low: 3 };
      return priorityOrder[a.urgency] - priorityOrder[b.urgency];
    });
  }

  async updatePostProcessingProgress(componentId: number, completedCount: number): Promise<void> {
    await this.ensureDatabase();
    
    const component = await this.db!.getFirstAsync(
      'SELECT * FROM components_3d WHERE id = ?',
      [componentId]
    ) as any;
    
    if (!component) {
      throw new Error('Component not found');
    }
    
    const newCompleted = component.post_processing_completed + completedCount;
    const newPending = Math.max(0, component.post_processing_pending - completedCount);
    
    await this.db!.runAsync(
      'UPDATE components_3d SET post_processing_completed = ?, post_processing_pending = ? WHERE id = ?',
      [newCompleted, newPending, componentId]
    );
    
    console.log(`Updated post-processing: ${component.name} +${completedCount} completed`);
  }

  // Settings methods
  async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    await this.ensureDatabase();
    
    const result = await this.db!.getFirstAsync(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      [key]
    ) as any;
    
    return result?.setting_value || defaultValue;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.ensureDatabase();
    
    await this.db!.runAsync(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(setting_key) DO UPDATE SET 
       setting_value = excluded.setting_value,
       updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  async getTargetProductsBuffer(): Promise<number> {
    const value = await this.getSetting('target_products_buffer', '10');
    return parseInt(value) || 10;
  }

  async setTargetProductsBuffer(buffer: number): Promise<void> {
    await this.setSetting('target_products_buffer', buffer.toString());
  }
}

export const DatabaseService = new DatabaseServiceClass();
