import React, { useState } from 'react';
import { Languages, Tag } from 'lucide-react';
import LanguageTab from './LanguageTab';
import TagsTab from './TagsTab';

const TABS = [
  { id: 'language', label: 'Language', Icon: Languages },
  { id: 'tags',     label: 'Tags',     Icon: Tag       },
];

const ProfileManagementSection = () => {
  const [activeTab, setActiveTab] = useState('language');

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

      {activeTab === 'language' ? <LanguageTab /> : <TagsTab />}
    </div>
  );
};

export default ProfileManagementSection;
