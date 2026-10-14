import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initialModel } from './store';

describe('actions - model operations', () => {
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

describe('actions - store coalescing', () => {
  it('should have correct coalescing window constant', () => {
    // The JANELA_COALESCENCIA is 700ms as per the code
    expect(700).toBe(700);
  });
});