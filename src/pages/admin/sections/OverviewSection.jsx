import React from 'react';
import FinanceOverview from '../../../components/charts/FinanceOverview';

const OverviewSection = () => (
  <div className="space-y-4 sm:space-y-6">
    {/* Revenue / Expense / Income statistics */}
    <FinanceOverview />
  </div>
);

export default OverviewSection;
