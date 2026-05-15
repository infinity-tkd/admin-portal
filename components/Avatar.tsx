import React, { useState } from 'react';

interface AvatarProps {
  profilePictureId?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ profilePictureId, name, size = 'md', className = '' }) => {
  const [error, setError] = useState(false);

  React.useEffect(() => {
    setError(false);
  }, [profilePictureId]);

  const sizeClasses = {
    sm: 'h-8 w-8 text-[9px]',
    md: 'h-10 w-10 text-[11px]',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl'
  };

  const getInitials = (n: string) => {
    if (!n) return '?';
    return n.trim().split(' ').map(i => i[0]).slice(0, 2).join('').toUpperCase();
  };

  // Brand-aligned gradients — red-based variations
  const gradients = [
    'from-red-400 to-red-600',
    'from-red-500 to-rose-700',
    'from-neutral-600 to-neutral-800',
    'from-red-300 to-red-500'
  ];

  // Deterministic gradient based on name
  const gradientIndex = name ? name.length % gradients.length : 0;
  const gradient = gradients[gradientIndex];

  if (profilePictureId && !error) {
    return (
      <img
        src={`https://drive.google.com/thumbnail?id=${profilePictureId}&sz=s700`}
        alt={name}
        className={`rounded-full object-cover border-2 border-white ring-1 ring-neutral-200 ${sizeClasses[size]} ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className={`rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center font-bold text-white shadow-sm font-display border border-white/50 ${sizeClasses[size]} ${className}`}>
      {getInitials(name)}
    </div>
  );
};