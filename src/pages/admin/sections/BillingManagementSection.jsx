import React, { useState } from 'react';
import { Cloud } from 'lucide-react';
import DigitalOceanTab from './DigitalOceanTab';

const TABS = [
  { id: 'digitalocean', label: 'Digital Ocean', Icon: Cloud },
];

const BillingManagementSection = () => {
  const [activeTab, setActiveTab] = useState('digitalocean');

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === id
                ? 'border-black text-black'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'digitalocean' && <DigitalOceanTab />}
    </div>
  );
};

export default BillingManagementSection;
