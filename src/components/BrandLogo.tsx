import React, { useState } from 'react';
import { Droplets } from 'lucide-react';

export function BrandLogo({ dark = true, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 select-none">
      <span
        className={`inline-flex items-center justify-center rounded-lg font-display font-extrabold tracking-wider shrink-0 border ${
          compact ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs'
        } ${
          dark
            ? 'bg-[#0F2744] border-teal-500/60 text-teal-300'
            : 'bg-[#0A1628] border-teal-600 text-teal-300'
        }`}
        aria-hidden="true"
      >
        NE
      </span>
      <span
        className={`font-display font-extrabold tracking-tight ${
          compact ? 'text-[13px]' : 'text-sm sm:text-base'
        } ${dark ? 'text-white' : 'text-slate-900'}`}
      >
        NewEdgeEngineeringAndWorks
      </span>
    </span>
  );
}

export function SafeImage({
  src,
  alt,
  className = '',
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#13294B] to-[#0D9488] text-white/90 p-4 text-center ${className}`}
      >
        <Droplets className="w-8 h-8 text-teal-300 mb-2" />
        <span className="text-xs font-medium line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
