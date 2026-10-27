export function Balls() {
  return (
    <div className="balls" aria-hidden="true">
      <Soccer className="ball ball-a" />
      <Football className="ball ball-b" />
      <Basketball className="ball ball-c" />
      <Tennis className="ball ball-d" />
      <Baseball className="ball ball-e" />
      <Soccer className="ball ball-f" />
    </div>
  );
}

function Soccer({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="#f7f4ee" stroke="#1f1e1d" strokeWidth="2" />
      <path d="M32 16l8 6-3 9H27l-3-9z" fill="#1f1e1d" />
      <path d="M32 16L24 14M40 22l10-2M43 31l8 8M27 31l-8 8M24 22L14 20" fill="none" stroke="#1f1e1d" strokeWidth="2" />
    </svg>
  );
}

function Football({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64">
      <ellipse cx="32" cy="32" rx="26" ry="16" fill="#8c4a1f" transform="rotate(-28 32 32)" />
      <path d="M24 34c6-8 12-8 18 0" fill="none" stroke="#f5f1ea" strokeWidth="2" transform="rotate(-28 32 32)" />
      <path d="M29 30v8M33 29v9M37 30v8" stroke="#f5f1ea" strokeWidth="1.5" transform="rotate(-28 32 32)" />
    </svg>
  );
}

function Basketball({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="#e07a2f" />
      <path d="M32 4v56M4 32h56M12 12c12 8 28 8 40 0M12 52c12-8 28-8 40 0" fill="none" stroke="#1f1e1d" strokeWidth="2" />
    </svg>
  );
}

function Tennis({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="#d6e34a" />
      <path d="M14 18c14 8 14 20 0 28M50 18c-14 8-14 20 0 28" fill="none" stroke="#f7f4ee" strokeWidth="3" />
    </svg>
  );
}

function Baseball({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="28" fill="#f7f4ee" stroke="#1f1e1d" strokeWidth="2" />
      <path d="M18 14c8 6 8 30 0 36M46 14c-8 6-8 30 0 36" fill="none" stroke="#9b2331" strokeWidth="2" />
    </svg>
  );
}
