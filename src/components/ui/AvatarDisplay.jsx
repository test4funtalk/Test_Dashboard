const AvatarDisplay = ({ src, name, size = 'md' }) => {
  const sz =
    size === 'xl' ? 'h-20 w-20 text-2xl' :
    size === 'lg' ? 'h-14 w-14 text-xl' :
    size === 'sm' ? 'h-8 w-8 text-xs' :
    'h-10 w-10 text-sm';

  if (src)
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={`${sz} flex-shrink-0 rounded-full object-cover`}
      />
    );

  return (
    <div className={`${sz} flex flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 font-bold text-neutral-600`}>
      {(name || 'A')[0].toUpperCase()}
    </div>
  );
};

export default AvatarDisplay;
