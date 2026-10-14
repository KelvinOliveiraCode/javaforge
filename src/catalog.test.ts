import { describe, it, expect } from 'vitest';
import { CATALOG, COMPONENT_GROUPS, catalogOf, defaultPropsFor, makeComponentId } from './catalog';
import type { ComponentType, ComponentSpec } from './types';

describe('catalog', () => {
  describe('CATALOG', () => {
    it('should have 22 component types', () => {
      expect(CATALOG.length).toBe(22);
    });

    it('should have all required fields for each entry', () => {
      for (const entry of CATALOG) {
        expect(entry.type).toBeDefined();
        expect(entry.label).toBeDefined();
        expect(entry.group).toBeDefined();
        expect(entry.description).toBeDefined();
        expect(typeof entry.defaultWidth).toBe('number');
        expect(typeof entry.defaultHeight).toBe('number');
        expect(entry.defaultProps).toBeDefined();
        expect(Array.isArray(entry.propFields)).toBe(true);
        expect(Array.isArray(entry.events)).toBe(true);
        expect(typeof entry.isContainer).toBe('boolean');
      }
    });

    it('should cover all ComponentType values', () => {
      const types = CATALOG.map(e => e.type);
      const allTypes: ComponentType[] = [
        'JLabel', 'JButton', 'JTextField', 'JPasswordField', 'JTextArea',
        'JCheckBox', 'JRadioButton', 'JComboBox', 'JList', 'JTable',
        'JPanel', 'JScrollPane', 'JProgressBar', 'JSpinner', 'JToggleButton',
        'JSeparator', 'JSlider', 'JScrollBar', 'JTextPane', 'JEditorPane',
        'JToolBar', 'JTree',
      ];
      for (const t of allTypes) {
        expect(types).toContain(t);
      }
    });
  });

  describe('COMPONENT_GROUPS', () => {
    it('should have 4 groups', () => {
      expect(COMPONENT_GROUPS).toEqual(['Básicos', 'Dados', 'Contêineres', 'Exibição']);
    });
  });

  describe('catalogOf', () => {
    it('should return correct entry for known type', () => {
      const btn = catalogOf('JButton');
      expect(btn.type).toBe('JButton');
      expect(btn.label).toBe('Botão');
      expect(btn.group).toBe('Básicos');
    });

    it('should throw for unknown type', () => {
      expect(() => catalogOf('JUnknown' as ComponentType)).toThrow('Tipo desconhecido');
    });
  });

  describe('defaultPropsFor', () => {
    it('should return a copy of default props', () => {
      const props1 = defaultPropsFor('JButton');
      const props2 = defaultPropsFor('JButton');
      expect(props1).toEqual({ text: 'Botão', toolTipText: '', enabled: true });
      expect(props1).not.toBe(props2); // should be a copy
    });

    it('should return correct props for each type', () => {
      expect(defaultPropsFor('JTextField')).toEqual({ columns: 20, text: '', toolTipText: '', enabled: true });
      expect(defaultPropsFor('JPasswordField')).toEqual({ columns: 16, toolTipText: '', enabled: true });
      expect(defaultPropsFor('JLabel')).toEqual({ text: 'Rótulo' });
    });
  });

  describe('makeComponentId', () => {
    it('should generate unique ids based on type prefix', () => {
      const existing: ComponentSpec[] = [];
      expect(makeComponentId('JButton', existing)).toBe('btn1');
      expect(makeComponentId('JLabel', existing)).toBe('lbl1');
      expect(makeComponentId('JTextField', existing)).toBe('txt1');
    });

    it('should avoid conflicts with existing ids', () => {
      const existing: ComponentSpec[] = [
        { id: 'btn1', type: 'JButton', x: 0, y: 0, width: 100, height: 30, props: {}, parentId: null },
        { id: 'btn2', type: 'JButton', x: 0, y: 0, width: 100, height: 30, props: {}, parentId: null },
      ];
      expect(makeComponentId('JButton', existing)).toBe('btn3');
    });

    it('should handle all component types', () => {
      const types: ComponentType[] = [
        'JLabel', 'JButton', 'JTextField', 'JPasswordField', 'JTextArea',
        'JCheckBox', 'JRadioButton', 'JComboBox', 'JList', 'JTable',
        'JPanel', 'JScrollPane', 'JProgressBar', 'JSpinner', 'JToggleButton',
        'JSeparator', 'JSlider', 'JScrollBar', 'JTextPane', 'JEditorPane',
        'JToolBar', 'JTree',
      ];
      for (const t of types) {
        const id = makeComponentId(t, []);
        expect(id.length).toBeGreaterThan(0);
        expect(id).not.toBe('1');
      }
    });
  });
});