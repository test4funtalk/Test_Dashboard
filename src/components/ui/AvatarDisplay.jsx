import React, { useState } from 'react';

const AvatarDisplay = React.memo(({ src, name, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const sz =
    size === 'xl' ? 'h-20 w-20 text-2xl' :
    size === 'lg' ? 'h-14 w-14 text-xl' :
    size === 'sm' ? 'h-8 w-8 text-xs' :
    'h-10 w-10 text-sm';

  const initials = (
    <div className={`${sz} flex flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 font-bold text-neutral-600`}>
      {(name || 'A')[0].toUpperCase()}
    </div>
  );

  if (!src || imgError) return initials;

  return (
    <img
      src={src}
      alt={name || 'avatar'}
      loading="lazy"
      onError={() => setImgError(true)}
      className={`${sz} flex-shrink-0 rounded-full object-cover`}
    />
  );
});

AvatarDisplay.displayName = 'AvatarDisplay';

export default AvatarDisplay;
