import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store, initialModel } from './store';
import type { AppModel } from './types';
import type { State } from './store';

// Use the exported constants
const HISTORY_LIMIT = 100;
const COALESCING_WINDOW = 700;

function createTestModel(overrides: Partial<AppModel> = {}): AppModel {
  return {
    schemaVersion: 1,
    name: 'TestApp',
    packageName: 'com.test.app',
    mainWindowId: 'principal',
    windows: [],
    database: { file: 'data/app.db', tables: [] },
    connections: [],
    buildTool: 'maven',
    ...overrides,
  };
}

function createTestState(overrides: Partial<State> = {}): State {
  return {
    screen: 'ide',
    project: null,
    model: createTestModel(),
    undoStack: [],
    redoStack: [],
    lastEditLabel: '',
    lastEditAt: 0,
    modelPath: '',
    tree: [],
    recent: [],
    leftTab: 'files',
    designerWindowId: '',
    selectedComponentId: null,
    centerTab: 'design',
    openTabs: [],
    rightTab: 'props',
    output: [],
    running: false,
    problems: [],
    busy: null,
    toast: null,
    dragType: null,
    snapGrid: true,
    ...overrides,
  };
}

describe('store', () => {
  describe('constants', () => {
    it('should have correct history limit', () => {
      expect(HISTORY_LIMIT).toBe(100);
    });

    it('should have correct coalescing window (700ms)', () => {
      expect(COALESCING_WINDOW).toBe(700);
    });
  });

  describe('Store class', () => {
    let store: Store<State>;

    beforeEach(() => {
      store = new Store(createTestState());
    });

    describe('setModel', () => {
      it('should update model and push to undoStack', () => {
        const newModel = createTestModel({ name: 'NovoNome' });
        store.setModel(newModel, 'test-label');
        expect(store.getState().model.name).toBe('NovoNome');
        expect(store.getState().undoStack.length).toBe(1);
        expect(store.getState().undoStack[0].name).toBe('TestApp');
      });

      it('should not push to undoStack if model is same reference', () => {
        const model = store.getState().model;
        store.setModel(model, 'test-label');
        expect(store.getState().undoStack.length).toBe(0);
      });

      it('should coalesce rapid edits with same label within window', () => {
        vi.useFakeTimers();
        
        const model1 = createTestModel({ name: 'Edit1' });
        store.setModel(model1, 'editar');
        expect(store.getState().undoStack.length).toBe(1);

        // Advance time by less than coalescing window
        vi.advanceTimersByTime(300);
        
        const model2 = createTestModel({ name: 'Edit2' });
        store.setModel(model2, 'editar');
        expect(store.getState().undoStack.length).toBe(1); // Still 1, coalesced
        expect(store.getState().model.name).toBe('Edit2');

        vi.useRealTimers();
      });

      it('should NOT coalesce if label is different', () => {
        vi.useFakeTimers();
        
        const model1 = createTestModel({ name: 'Edit1' });
        store.setModel(model1, 'label1');
        expect(store.getState().undoStack.length).toBe(1);

        vi.advanceTimersByTime(300);
        
        const model2 = createTestModel({ name: 'Edit2' });
        store.setModel(model2, 'label2'); // Different label
        expect(store.getState().undoStack.length).toBe(2); // Not coalesced

        vi.useRealTimers();
      });

      it('should NOT coalesce if time exceeds window', () => {
        vi.useFakeTimers();
        
        const model1 = createTestModel({ name: 'Edit1' });
        store.setModel(model1, 'editar');
        expect(store.getState().undoStack.length).toBe(1);

        // Advance time by MORE than coalescing window (700ms)
        vi.advanceTimersByTime(800);
        
        const model2 = createTestModel({ name: 'Edit2' });
        store.setModel(model2, 'editar');
        expect(store.getState().undoStack.length).toBe(2); // Not coalesced, time exceeded

        vi.useRealTimers();
      });

      it('should clear redoStack on new edit', () => {
        store.setState({ redoStack: [createTestModel()] });
        store.setModel(createTestModel({ name: 'Novo' }), 'label');
        expect(store.getState().redoStack.length).toBe(0);
      });

      it('should limit undoStack to HISTORY_LIMIT', () => {
        for (let i = 0; i < 150; i++) {
          store.setModel(createTestModel({ name: `App${i}` }), `label${i}`);
        }
        expect(store.getState().undoStack.length).toBe(HISTORY_LIMIT);
      });
    });

    describe('undo', () => {
      it('should return false if undoStack is empty', () => {
        expect(store.undo()).toBe(false);
      });

      it('should restore previous model', () => {
        // Use different labels to avoid coalescing
        store.setModel(createTestModel({ name: 'Edit1' }), 'label1');
        store.setModel(createTestModel({ name: 'Edit2' }), 'label2');
        
        expect(store.undo()).toBe(true);
        expect(store.getState().model.name).toBe('Edit1');
        expect(store.getState().undoStack.length).toBe(1);
        expect(store.getState().redoStack.length).toBe(1);
      });

      it('should move current model to redoStack', () => {
        store.setModel(createTestModel({ name: 'Edit1' }), 'label1');
        store.setModel(createTestModel({ name: 'Edit2' }), 'label2');
        const currentBeforeUndo = store.getState().model; // This is Edit2
        
        store.undo();
        expect(store.getState().redoStack[0]).toBe(currentBeforeUndo);
      });

      it('should clear lastEditLabel and lastEditAt', () => {
        store.setModel(createTestModel({ name: 'Edit1' }), 'label');
        store.setState({ lastEditLabel: 'test', lastEditAt: Date.now() });
        
        store.undo();
        expect(store.getState().lastEditLabel).toBe('');
        expect(store.getState().lastEditAt).toBe(0);
      });

      it('should limit redoStack to HISTORY_LIMIT', () => {
        for (let i = 0; i < 150; i++) {
          store.setModel(createTestModel({ name: `App${i}` }), `label${i}`);
        }
        // Undo all to fill redoStack
        for (let i = 0; i < 150; i++) {
          store.undo();
        }
        expect(store.getState().redoStack.length).toBe(HISTORY_LIMIT);
      });
    });

    describe('redo', () => {
      it('should return false if redoStack is empty', () => {
        expect(store.redo()).toBe(false);
      });

      it('should restore next model from redoStack', () => {
        store.setModel(createTestModel({ name: 'Edit1' }), 'label1');
        store.setModel(createTestModel({ name: 'Edit2' }), 'label2');
        store.undo(); // back to Edit1
        
        expect(store.redo()).toBe(true);
        expect(store.getState().model.name).toBe('Edit2');
        expect(store.getState().undoStack.length).toBe(2);
        expect(store.getState().redoStack.length).toBe(0);
      });

      it('should move model back to undoStack', () => {
        store.setModel(createTestModel({ name: 'Edit1' }), 'label1');
        store.setModel(createTestModel({ name: 'Edit2' }), 'label2');
        store.undo();
        
        const edit1 = store.getState().model;
        store.redo();
        expect(store.getState().undoStack[1]).toBe(edit1);
      });

      it('should clear lastEditLabel and lastEditAt', () => {
        store.setModel(createTestModel({ name: 'Edit1' }), 'label1');
        store.setModel(createTestModel({ name: 'Edit2' }), 'label2');
        store.undo();
        store.setState({ lastEditLabel: 'test', lastEditAt: Date.now() });
        
        store.redo();
        expect(store.getState().lastEditLabel).toBe('');
        expect(store.getState().lastEditAt).toBe(0);
      });
    });

    describe('subscribe', () => {
      it('should notify listeners on state change', () => {
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);
        
        store.setState({ model: createTestModel({ name: 'Novo' }) });
        expect(listener).toHaveBeenCalledTimes(1);
        
        unsubscribe();
        store.setState({ model: createTestModel({ name: 'Outro' }) });
        expect(listener).toHaveBeenCalledTimes(1); // Not called after unsubscribe
      });
    });
  });

  describe('initialModel', () => {
    it('should return a valid default model', () => {
      const model = initialModel();
      expect(model.schemaVersion).toBe(1);
      expect(model.name).toBe('NovoApp');
      expect(model.packageName).toBe('com.exemplo.app');
      expect(model.mainWindowId).toBe('janelaPrincipal');
      expect(model.windows).toEqual([]);
      expect(model.database.file).toBe('data/app.db');
      expect(model.database.tables).toEqual([]);
      expect(model.connections).toEqual([]);
      expect(model.buildTool).toBe('maven');
    });
  });
});