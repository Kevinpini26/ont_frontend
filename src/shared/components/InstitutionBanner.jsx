import { MapPinned } from 'lucide-react';

export function InstitutionBanner({ eyebrow = 'Office National du Tourisme', title, description, className = '' }) {
  return (
    <section className={`institution-banner rounded-card border border-white/10 px-5 py-5 text-white shadow-[0_1px_2px_rgb(15_23_42/0.08)] sm:px-6 ${className}`}>
      <div className="relative max-w-2xl">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ont-gold-300">
          <MapPinned size={15} aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 className="font-heading text-xl font-semibold leading-tight sm:text-2xl">{title}</h2>
        {description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">{description}</p>}
      </div>
    </section>
  );
}
