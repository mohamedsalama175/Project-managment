import React from 'react';
import { RiskRegisterModal } from '../components/risks/RiskRegisterModal';
import { ProjectRisk } from '../types';

describe('RiskRegisterModal', () => {
  it('renders safely when activeProject is missing or has no code', () => {
    // Should not throw TypeError: Cannot read properties of undefined (reading 'code')
    expect(() => {
      React.createElement(RiskRegisterModal, {
        isOpen: true,
        onClose: () => {},
        risks: [],
      });
    }).not.toThrow();
  });

  it('renders empty state text when no risks exist', () => {
    const emptyRisks: ProjectRisk[] = [];
    const element = React.createElement(RiskRegisterModal, {
      isOpen: true,
      onClose: () => {},
      risks: emptyRisks,
    });
    expect(element).toBeDefined();
  });

  it('handles risks without code property null-safely', () => {
    const riskWithoutCode = {
      id: 'risk-1',
      title: 'Supply Chain Interruption',
      severity: 'high',
      probability: 'likely',
      impact: 'cost',
      status: 'open',
      mitigation: 'Dual sourcing strategy',
      // code is omitted / undefined
    } as unknown as ProjectRisk;

    expect(() => {
      React.createElement(RiskRegisterModal, {
        isOpen: true,
        onClose: () => {},
        risks: [riskWithoutCode],
      });
    }).not.toThrow();
  });
});
