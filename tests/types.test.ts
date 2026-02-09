import { describe, it, expect } from 'vitest';
import { AppRole, TabCategory } from '../types';

describe('types', () => {
  describe('AppRole', () => {
    it('should have ADMIN role', () => {
      expect(AppRole.ADMIN).toBe('ADMIN');
    });

    it('should have all department roles', () => {
      expect(AppRole.SOSFU_GESTOR).toBe('SOSFU_GESTOR');
      expect(AppRole.SOSFU_EQUIPE).toBe('SOSFU_EQUIPE');
      expect(AppRole.SEFIN_GESTOR).toBe('SEFIN_GESTOR');
      expect(AppRole.SEFIN_EQUIPE).toBe('SEFIN_EQUIPE');
      expect(AppRole.AJSEFIN_GESTOR).toBe('AJSEFIN_GESTOR');
      expect(AppRole.AJSEFIN_EQUIPE).toBe('AJSEFIN_EQUIPE');
      expect(AppRole.SGP_GESTOR).toBe('SGP_GESTOR');
      expect(AppRole.SGP_EQUIPE).toBe('SGP_EQUIPE');
      expect(AppRole.SEAD_GESTOR).toBe('SEAD_GESTOR');
      expect(AppRole.SEAD_EQUIPE).toBe('SEAD_EQUIPE');
      expect(AppRole.PRESIDENCIA_GESTOR).toBe('PRESIDENCIA_GESTOR');
      expect(AppRole.PRESIDENCIA_EQUIPE).toBe('PRESIDENCIA_EQUIPE');
      expect(AppRole.SODPA_GESTOR).toBe('SODPA_GESTOR');
      expect(AppRole.SODPA_EQUIPE).toBe('SODPA_EQUIPE');
    });

    it('should have all 16 roles', () => {
      const roles = Object.keys(AppRole);
      expect(roles.length).toBe(16);
    });
  });

  describe('TabCategory', () => {
    it('should have OPERATIONAL, FINANCIAL and MANAGEMENT categories', () => {
      expect(TabCategory.OPERATIONAL).toBe('OPERATIONAL');
      expect(TabCategory.FINANCIAL).toBe('FINANCIAL');
      expect(TabCategory.MANAGEMENT).toBe('MANAGEMENT');
    });
  });
});
