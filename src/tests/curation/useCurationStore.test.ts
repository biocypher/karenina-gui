import { describe, it, expect, beforeEach } from 'vitest';
import { useCurationStore } from '../../stores/useCurationStore';

describe('useCurationStore', () => {
  beforeEach(() => {
    useCurationStore.getState().reset();
  });

  describe('curator management', () => {
    it('adds a curator and sets as active', () => {
      const { addCurator } = useCurationStore.getState();
      addCurator('Dr. Smith', { affiliation: 'EBI' });

      const state = useCurationStore.getState();
      expect(state.curators).toHaveLength(1);
      expect(state.curators[0].name).toBe('Dr. Smith');
      expect(state.curators[0].metadata).toEqual({ affiliation: 'EBI' });
      expect(state.activeCuratorId).toBe(state.curators[0].id);
    });

    it('removes a curator and clears their judgments', () => {
      const { addCurator } = useCurationStore.getState();
      addCurator('Dr. Smith', {});
      const curatorId = useCurationStore.getState().curators[0].id;

      useCurationStore.getState().setTemplateJudgment('result1', 'field1', {
        judgment: 'agree',
        confidence: null,
        note: null,
      });

      useCurationStore.getState().removeCurator(curatorId);
      const state = useCurationStore.getState();
      expect(state.curators).toHaveLength(0);
      expect(state.activeCuratorId).toBeNull();
      expect(state.templateJudgments[curatorId]).toBeUndefined();
    });

    it('switches active curator', () => {
      const { addCurator } = useCurationStore.getState();
      addCurator('Curator A', {});
      addCurator('Curator B', {});

      const state = useCurationStore.getState();
      const idA = state.curators[0].id;
      state.setActiveCurator(idA);
      expect(useCurationStore.getState().activeCuratorId).toBe(idA);
    });
  });

  describe('judgment management', () => {
    beforeEach(() => {
      useCurationStore.getState().addCurator('Test Curator', {});
    });

    it('sets a template judgment', () => {
      const { setTemplateJudgment, activeCuratorId } = useCurationStore.getState();
      setTemplateJudgment('result1', 'capital_city', {
        judgment: 'agree',
        confidence: 4,
        note: 'Correct extraction',
      });

      const state = useCurationStore.getState();
      const j = state.templateJudgments[activeCuratorId!]['result1']['capital_city'];
      expect(j.judgment).toBe('agree');
      expect(j.confidence).toBe(4);
      expect(j.note).toBe('Correct extraction');
      expect(state.hasBeenExported).toBe(false);
    });

    it('clears a template judgment', () => {
      const { setTemplateJudgment, clearTemplateJudgment } = useCurationStore.getState();
      setTemplateJudgment('result1', 'field1', {
        judgment: 'agree',
        confidence: null,
        note: null,
      });
      clearTemplateJudgment('result1', 'field1');

      const state = useCurationStore.getState();
      const resultJudgments = state.templateJudgments[state.activeCuratorId!]?.['result1'];
      expect(resultJudgments?.['field1']).toBeUndefined();
    });

    it('sets a rubric judgment', () => {
      const { setRubricJudgment, activeCuratorId } = useCurationStore.getState();
      setRubricJudgment('result1', 'clarity', {
        judgment: 'disagree',
        confidence: 2,
        note: 'Judge was too lenient',
      });

      const j = useCurationStore.getState().rubricJudgments[activeCuratorId!]['result1']['clarity'];
      expect(j.judgment).toBe('disagree');
    });

    it('toggles curated flag', () => {
      const { toggleCurated, activeCuratorId } = useCurationStore.getState();
      toggleCurated('result1');
      expect(useCurationStore.getState().curatedFlags[activeCuratorId!]['result1']).toBe(true);

      toggleCurated('result1');
      expect(useCurationStore.getState().curatedFlags[activeCuratorId!]['result1']).toBe(false);
    });

    it('marks hasBeenExported false on new judgment after export', () => {
      const state = useCurationStore.getState();
      state.setTemplateJudgment('r1', 'f1', { judgment: 'agree', confidence: null, note: null });
      state.markExported();
      expect(useCurationStore.getState().hasBeenExported).toBe(true);

      state.setTemplateJudgment('r1', 'f2', { judgment: 'disagree', confidence: null, note: null });
      expect(useCurationStore.getState().hasBeenExported).toBe(false);
    });
  });

  describe('judgment isolation between curators', () => {
    it('keeps judgments separate per curator', () => {
      const { addCurator } = useCurationStore.getState();
      addCurator('Curator A', {});
      const idA = useCurationStore.getState().curators[0].id;

      useCurationStore.getState().setTemplateJudgment('r1', 'f1', {
        judgment: 'agree',
        confidence: null,
        note: null,
      });

      addCurator('Curator B', {});
      const idB = useCurationStore.getState().curators[1].id;
      useCurationStore.getState().setActiveCurator(idB);

      useCurationStore.getState().setTemplateJudgment('r1', 'f1', {
        judgment: 'disagree',
        confidence: null,
        note: null,
      });

      const state = useCurationStore.getState();
      expect(state.templateJudgments[idA]['r1']['f1'].judgment).toBe('agree');
      expect(state.templateJudgments[idB]['r1']['f1'].judgment).toBe('disagree');
    });
  });
});
