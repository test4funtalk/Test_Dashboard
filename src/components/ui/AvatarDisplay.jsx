import React, { useState } from 'react';
import api from '../../services/api';

// Some avatar values come back as a server-relative path (e.g. "/uploads/avatar.jpg")
// rather than an absolute URL — resolve those against the API origin so the <img>
// doesn't try to load them relative to the dashboard's own domain and 404 silently.
const resolveAvatarSrc = (src) => {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const base = (api.defaults.baseURL || '').replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const AvatarDisplay = React.memo(({ src, name, size = 'md', isSuperAdmin = false }) => {
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

  const logo = (
    <img
      src="/LG!.png"
      alt={name || 'avatar'}
      className={`${sz} flex-shrink-0 rounded-full bg-neutral-100 object-contain`}
    />
  );

  const fallback = isSuperAdmin ? logo : initials;

  const resolvedSrc = resolveAvatarSrc(src);
  if (!resolvedSrc || imgError) return fallback;

  return (
    <img
      src={resolvedSrc}
      alt={name || 'avatar'}
      loading="lazy"
      onError={() => setImgError(true)}
      className={`${sz} flex-shrink-0 rounded-full object-cover`}
    />
  );
});

AvatarDisplay.displayName = 'AvatarDisplay';

export default AvatarDisplay;
