import { describe, it, expect } from 'vitest';
import { cloneModel, findWindow, findComponent, allComponents, newComponent, renameComponentId, removeComponent, newConnection, updateConnection, windowIds, sqlTypeOfColumn, makeSeedRow, addMenu, removeMenu, updateMenu, addMenuItem, updateMenuItem, removeMenuItem, menuItems } from './model-ops';
import type { AppModel, WindowSpec, ComponentSpec, ConnectionSpec, ComponentType } from './types';

function baseModel(): AppModel {
  return {
    schemaVersion: 1,
    name: 'TestApp',
    packageName: 'com.test.app',
    mainWindowId: 'principal',
    windows: [
      {
        id: 'principal',
        title: 'Principal',
        width: 800,
        height: 600,
        components: [
          { id: 'btnAcao', type: 'JButton', x: 10, y: 10, width: 100, height: 30, props: { text: 'Clique' }, parentId: null },
          { id: 'txtNome', type: 'JTextField', x: 10, y: 50, width: 200, height: 26, props: { columns: 20 }, parentId: null },
        ],
        menu: [],
      },
      {
        id: 'secundaria',
        title: 'Secundária',
        width: 400,
        height: 300,
        components: [],
        menu: [],
      },
    ],
    database: {
      file: 'data/app.db',
      tables: [
        {
          name: 'usuarios',
          columns: [
            { name: 'id', type: 'INTEGER', pk: true, notNull: false, autoIncrement: true },
            { name: 'nome', type: 'TEXT', pk: false, notNull: true, autoIncrement: false },
            { name: 'email', type: 'TEXT', pk: false, notNull: false, autoIncrement: false },
          ],
          seedRows: [],
        },
      ],
    },
    connections: [
      { id: 'conn1', name: 'Conexão 1', componentId: 'btnAcao', event: 'actionPerformed', kind: 'message', table: '', params: [], queryColumns: [], targetTableComponentId: '', openWindowId: '', closeCurrent: false, message: 'Olá', messageTitle: 'Aviso', messageKind: 'info', authSuccessWindowId: '', customCode: '' },
    ],
    buildTool: 'maven',
  };
}

describe('model-ops', () => {
  describe('cloneModel', () => {
    it('should create a deep copy of the model', () => {
      const model = baseModel();
      const cloned = cloneModel(model);
      expect(cloned).toEqual(model);
      expect(cloned).not.toBe(model);
      expect(cloned.windows).not.toBe(model.windows);
    });
  });

  describe('findWindow', () => {
    it('should find existing window by id', () => {
      const model = baseModel();
      const win = findWindow(model, 'principal');
      expect(win).toBeDefined();
      expect(win?.id).toBe('principal');
    });

    it('should return undefined for non-existent window', () => {
      const model = baseModel();
      const win = findWindow(model, 'inexistente');
      expect(win).toBeUndefined();
    });
  });

  describe('findComponent', () => {
    it('should find component in a window', () => {
      const model = baseModel();
      const comp = findComponent(model, 'principal', 'btnAcao');
      expect(comp).toBeDefined();
      expect(comp?.id).toBe('btnAcao');
    });

    it('should return undefined for non-existent component', () => {
      const model = baseModel();
      const comp = findComponent(model, 'principal', 'inexistente');
      expect(comp).toBeUndefined();
    });

    it('should return undefined for non-existent window', () => {
      const model = baseModel();
      const comp = findComponent(model, 'inexistente', 'btnAcao');
      expect(comp).toBeUndefined();
    });
  });

  describe('allComponents', () => {
    it('should return all components from all windows', () => {
      const model = baseModel();
      const comps = allComponents(model);
      expect(comps.length).toBe(2);
      expect(comps.map(c => c.component.id)).toEqual(['btnAcao', 'txtNome']);
    });
  });

  describe('newComponent', () => {
    it('should create a new component with unique id', () => {
      const model = baseModel();
      const comp = newComponent(model, 'principal', 'JButton', 10, 10, 100, 30, null);
      expect(comp.type).toBe('JButton');
      expect(comp.x).toBe(10);
      expect(comp.y).toBe(10);
      expect(comp.id).toMatch(/^btn\d+$/);
      expect(model.windows[0].components.some(c => c.id === comp.id)).toBe(false);
    });

    it('should not conflict with existing ids', () => {
      const model = baseModel();
      const comp1 = newComponent(model, 'principal', 'JButton', 10, 10, 100, 30, null);
      // Add comp1 to model for next call
      const modelWithComp1 = {
        ...model,
        windows: model.windows.map(w => w.id === 'principal' ? { ...w, components: [...w.components, comp1] as ComponentSpec[] } : w)
      };
      const comp2 = newComponent(modelWithComp1, 'principal', 'JButton', 20, 20, 100, 30, null);
      expect(comp1.id).not.toBe(comp2.id);
    });
  });

  describe('renameComponentId', () => {
    it('should rename component and update connections', () => {
      const model = baseModel();
      const next = renameComponentId(model, 'principal', 'btnAcao', 'btnNovo');
      expect(next).not.toBe(model);
      const win = findWindow(next, 'principal');
      expect(win?.components.find(c => c.id === 'btnNovo')).toBeDefined();
      expect(win?.components.find(c => c.id === 'btnAcao')).toBeUndefined();
      expect(next.connections[0].componentId).toBe('btnNovo');
    });

    it('should return same model if id unchanged', () => {
      const model = baseModel();
      const next = renameComponentId(model, 'principal', 'btnAcao', 'btnAcao');
      expect(next).toBe(model);
    });

    it('should return same model if new id already exists', () => {
      const model = baseModel();
      const next = renameComponentId(model, 'principal', 'btnAcao', 'txtNome');
      expect(next).toBe(model);
    });
  });

  describe('removeComponent', () => {
    it('should remove component and related connections', () => {
      const model = baseModel();
      const next = removeComponent(model, 'principal', 'btnAcao');
      expect(next).not.toBe(model);
      const win = findWindow(next, 'principal');
      expect(win?.components.find(c => c.id === 'btnAcao')).toBeUndefined();
      expect(next.connections.length).toBe(0);
    });

    it('should also remove child components', () => {
      const model = baseModel();
      const withChild = {
        ...model,
        windows: [{
          ...model.windows[0],
          components: [
            ...model.windows[0].components,
            { id: 'pnlGrupo', type: 'JPanel' as ComponentType, x: 0, y: 0, width: 200, height: 200, props: {}, parentId: null },
            { id: 'lblFilho', type: 'JLabel' as ComponentType, x: 10, y: 10, width: 100, height: 20, props: {}, parentId: 'pnlGrupo' },
          ],
        }],
      };
      const next = removeComponent(withChild, 'principal', 'pnlGrupo');
      const win = findWindow(next, 'principal');
      expect(win?.components.find(c => c.id === 'pnlGrupo')).toBeUndefined();
      expect(win?.components.find(c => c.id === 'lblFilho')).toBeUndefined();
    });
  });

  describe('newConnection', () => {
    it('should create connection with unique id', () => {
      const model = baseModel();
      const conn = newConnection(model);
      expect(conn.id).toMatch(/^conexao\d+$/);
      expect(conn.kind).toBe('message');
    });

    it('should use first table name if available', () => {
      const model = baseModel();
      const conn = newConnection(model);
      expect(conn.table).toBe('usuarios');
    });
  });

  describe('updateConnection', () => {
    it('should update connection properties', () => {
      const model = baseModel();
      const next = updateConnection(model, 'conn1', { kind: 'insert', table: 'usuarios' });
      expect(next).not.toBe(model);
      expect(next.connections[0].kind).toBe('insert');
      expect(next.connections[0].table).toBe('usuarios');
    });

    it('should return same model if connection not found', () => {
      const model = baseModel();
      const next = updateConnection(model, 'inexistente', { kind: 'insert' });
      expect(next).toBe(model);
    });
  });

  describe('windowIds', () => {
    it('should return array of window ids', () => {
      const model = baseModel();
      const ids = windowIds(model);
      expect(ids).toEqual(['principal', 'secundaria']);
    });
  });

  describe('sqlTypeOfColumn', () => {
    it('should return column type from model', () => {
      const model = baseModel();
      expect(sqlTypeOfColumn(model, 'usuarios', 'nome')).toBe('TEXT');
      expect(sqlTypeOfColumn(model, 'usuarios', 'id')).toBe('INTEGER');
    });

    it('should return TEXT for non-existent table/column', () => {
      const model = baseModel();
      expect(sqlTypeOfColumn(model, 'inexistente', 'col')).toBe('TEXT');
      expect(sqlTypeOfColumn(model, 'usuarios', 'inexistente')).toBe('TEXT');
    });
  });

  describe('makeSeedRow', () => {
    it('should create empty row with all column names', () => {
      const model = baseModel();
      const row = makeSeedRow(model.database.tables[0].columns);
      expect(row).toEqual({ id: '', nome: '', email: '' });
    });
  });

  describe('menu operations', () => {
    it('should add menu to window', () => {
      const model = baseModel();
      const next = addMenu(model, 'principal');
      expect(next.windows[0].menu.length).toBe(1);
      expect(next.windows[0].menu[0].id).toBe('menu1');
      expect(next.windows[0].menu[0].items.length).toBe(1);
    });

    it('should remove menu and its connections', () => {
      const model = {
        ...baseModel(),
        windows: [{
          ...baseModel().windows[0],
          menu: [{ id: 'menu1', label: 'Menu', items: [{ id: 'item1', label: 'Item' }] }],
        }],
        connections: [{ ...baseModel().connections[0], componentId: 'item1', id: 'conn-item' }],
      };
      const next = removeMenu(model, 'principal', 'menu1');
      expect(next.windows[0].menu.length).toBe(0);
      expect(next.connections.length).toBe(0);
    });

    it('should update menu', () => {
      const model = baseModel();
      const withMenu = addMenu(model, 'principal');
      const next = updateMenu(withMenu, 'principal', 'menu1', { label: 'Novo Label' });
      expect(next.windows[0].menu[0].label).toBe('Novo Label');
    });

    it('should add menu item', () => {
      const model = baseModel();
      const withMenu = addMenu(model, 'principal');
      const next = addMenuItem(withMenu, 'principal', 'menu1');
      expect(next.windows[0].menu[0].items.length).toBe(2);
      expect(next.windows[0].menu[0].items[1].id).toBe('itemmenu12');
    });

    it('should update menu item and connections', () => {
      const model = {
        ...baseModel(),
        windows: [{
          ...baseModel().windows[0],
          menu: [{ id: 'menu1', label: 'Menu', items: [{ id: 'item1', label: 'Item' }] }],
        }],
        connections: [{ ...baseModel().connections[0], componentId: 'item1', id: 'conn-item' }],
      };
      const next = updateMenuItem(model, 'principal', 'menu1', 'item1', { id: 'itemNovo' });
      expect(next.windows[0].menu[0].items[0].id).toBe('itemNovo');
      expect(next.connections[0].componentId).toBe('itemNovo');
    });

    it('should remove menu item and connections', () => {
      const model = {
        ...baseModel(),
        windows: [{
          ...baseModel().windows[0],
          menu: [{ id: 'menu1', label: 'Menu', items: [{ id: 'item1', label: 'Item' }] }],
        }],
        connections: [{ ...baseModel().connections[0], componentId: 'item1', id: 'conn-item' }],
      };
      const next = removeMenuItem(model, 'principal', 'menu1', 'item1');
      expect(next.windows[0].menu[0].items.length).toBe(0);
      expect(next.connections.length).toBe(0);
    });

    it('should list all menu items', () => {
      const model = baseModel();
      const withMenu = addMenu(model, 'principal');
      const items = menuItems(withMenu);
      expect(items.length).toBe(1);
      expect(items[0].item.id).toBe('item11');
      expect(items[0].windowId).toBe('principal');
      expect(items[0].menuId).toBe('menu1');
    });
  });
});