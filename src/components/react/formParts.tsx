// Pieces shared by the React forms (LeadForm, NewsletterForm): Turnstile, first-touch attribution, the GA
// ids sent with a submission, error copy, and the text-field and consent markup.
import { useEffect, useRef, type ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { GA_MEASUREMENT_ID } from '../../data/analytics';
import { turnstileSiteKey, type TurnstileAction } from '../../data/turnstile';
import { readFlag } from '../../lib/consent';
import { gaClientId, gaSessionId } from '../../lib/track';

// Minimal shape of the Turnstile explicit-render API. No @types package for it, so this is hand-rolled.
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileLoad: Promise<void> | undefined;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!turnstileLoad) {
    turnstileLoad = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => resolve(), { once: true });
      document.head.appendChild(script);
    });
  }
  return turnstileLoad;
}

/**
 * Renders a Turnstile widget into `hostRef` while `active` is true, and removes it when the host goes
 * away (e.g. the visitor switches to another path), so a later mount renders a fresh one.
 */
export function useTurnstile(active: boolean, action: TurnstileAction) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const tokenRef = useRef('');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const clearToken = () => {
      tokenRef.current = '';
    };
    loadTurnstile()
      .then(() => {
        const host = hostRef.current;
        if (cancelled || !host || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(host, {
          sitekey: turnstileSiteKey(window.location.hostname),
          action,
          callback: (token) => {
            tokenRef.current = token;
          },
          // Tokens last 5 minutes; the widget refreshes itself and calls `callback` again.
          'expired-callback': clearToken,
          'error-callback': clearToken,
        });
      })
      .catch(() => {
        // No token is captured; the server-side check then fails and the visitor sees the form error.
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
      tokenRef.current = '';
    };
  }, [active, action]);

  // Read at submit time, never during render.
  const token = () => tokenRef.current;
  const reset = () => {
    tokenRef.current = '';
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  };

  return { hostRef, token, reset };
}

type Attribution = {
  source_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
};

/** First-touch attribution (src/components/Attribution.astro) plus the GA ids, for the payload. */
export function submissionContext() {
  let attribution: Attribution = {};
  try {
    const raw = sessionStorage.getItem('lead-attribution');
    if (raw) attribution = JSON.parse(raw) as Attribution;
  } catch {
    // Storage blocked: send without attribution.
  }
  return {
    ...attribution,
    ga_client_id: gaClientId(),
    ga_session_id: gaSessionId(GA_MEASUREMENT_ID),
    ga_debug: readFlag('debug'),
    ga_internal: readFlag('internal'),
  };
}

// An endpoint's error body (src/lib/server/formGuard.ts and the handlers).
export type FormErrorBody = { error?: string; fields?: Record<string, string> };

export type ErrorCopy = {
  rateLimited: string;
  unavailable: string;
  rejected: string;
  verificationFailed: string;
  generic: string;
};

export function errorCopyFor(error: string | undefined, copy: ErrorCopy): string {
  switch (error) {
    case 'rate_limited':
      return copy.rateLimited;
    case 'unavailable':
      return copy.unavailable;
    case 'rejected':
      return copy.rejected;
    case 'verification_failed':
    case 'forbidden':
      return copy.verificationFailed;
    default:
      return copy.generic;
  }
}

export const controlClass = (hasError: boolean) =>
  [
    'mt-2 block w-full rounded-brand border bg-bg px-3.5 py-2.5 text-base text-ink placeholder:text-muted',
    'focus-visible:outline-2 focus-visible:outline-offset-1',
    hasError ? 'border-accent' : 'border-line hover:border-ink/40',
  ].join(' ');

export function describedBy(id: string, hint: boolean, error: boolean): string | undefined {
  const parts = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}

type FieldWrapProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function FieldWrap({ id, label, hint, error, required, children }: FieldWrapProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-muted"> (required)</span> : null}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-muted mt-1 text-sm">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-accent mt-1.5 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'url';
  hint?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  registration: UseFormRegisterReturn;
};

export function TextField({
  id,
  label,
  type = 'text',
  hint,
  error,
  required,
  autoComplete,
  registration,
}: TextFieldProps) {
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, !!hint, !!error)}
        className={controlClass(!!error)}
        {...registration}
      />
    </FieldWrap>
  );
}

type ConsentFieldProps = {
  id: string;
  /** Rendered as: `{prefix}` + a link to /privacy labelled `{linkText}` + `.` */
  prefix: string;
  linkText: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

export function ConsentField({ id, prefix, linkText, error, registration }: ConsentFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2.5 text-sm">
        <input
          id={id}
          type="checkbox"
          required
          className="accent-accent mt-0.5 size-4 shrink-0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...registration}
        />
        <span>
          {prefix}
          <a className="link" href="/privacy">
            {linkText}
          </a>
          .
        </span>
      </label>
      {error && (
        <p id={`${id}-error`} className="text-accent mt-1.5 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hidden from people, filled in by naive bots. Never shown, never focusable. */
export function Honeypot({
  id,
  label,
  registration,
}: {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="sr-only" aria-hidden="true">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" tabIndex={-1} autoComplete="off" {...registration} />
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-brand border-accent text-accent border px-4 py-3 text-sm">
      {children}
    </p>
  );
}

export const submitClass =
  'rounded-brand bg-accent text-on-accent hover:bg-ink hover:text-bg inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50';
