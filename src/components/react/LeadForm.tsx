// The /contact form. Validates with src/lib/lead.ts (the same schema POST /api/lead uses), so a client
// error and a server error always say the same thing. Anti-bot fields (Turnstile, honeypot, timing) are
// read by src/lib/server/leadHandler.ts.
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm, type Resolver, type UseFormRegisterReturn } from 'react-hook-form';
import {
  budgetBands,
  currencies,
  formCopy,
  leadPaths,
  serviceOptions,
  timelines,
  workModes,
} from '../../data/lead';
import { leadSchema } from '../../lib/lead';

type Path = '' | 'project' | 'role';
type Currency = (typeof currencies)[number]['value'];

// A flat superset of both branches of leadSchema's discriminated union: react-hook-form needs one shape
// to bind inputs to, and only the fields for the chosen `path` are required (leadSchema enforces that).
type FormValues = {
  path: Path;
  name: string;
  email: string;
  company: string;
  service: string;
  currency: Currency;
  budget: string;
  timeline: string;
  message: string;
  role_title: string;
  work_mode: string;
  job_url: string;
  consent: boolean;
  website: string; // honeypot
};

type Attribution = {
  source_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
};

// POST /api/lead's error body (see src/lib/server/leadHandler.ts).
type LeadErrorBody = { error?: string; fields?: Record<string, string> };

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

function readAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem('lead-attribution');
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

function errorCopyFor(error: string | undefined): string {
  switch (error) {
    case 'rate_limited':
      return formCopy.errors.rateLimited;
    case 'unavailable':
      return formCopy.errors.unavailable;
    case 'rejected':
      return formCopy.errors.rejected;
    case 'verification_failed':
    case 'forbidden':
      return formCopy.errors.verificationFailed;
    default:
      return formCopy.errors.generic;
  }
}

const defaultValues: FormValues = {
  path: '',
  name: '',
  email: '',
  company: '',
  service: '',
  currency: 'USD',
  budget: '',
  timeline: '',
  message: '',
  role_title: '',
  work_mode: '',
  job_url: '',
  consent: false,
  website: '',
};

const controlClass = (hasError: boolean) =>
  [
    'mt-2 block w-full rounded-brand border bg-bg px-3.5 py-2.5 text-base text-ink placeholder:text-muted',
    'focus-visible:outline-2 focus-visible:outline-offset-1',
    hasError ? 'border-accent' : 'border-line hover:border-ink/40',
  ].join(' ');

function describedBy(id: string, hint: boolean, error: boolean): string | undefined {
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

function FieldWrap({ id, label, hint, error, required, children }: FieldWrapProps) {
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

function TextField({
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

type TextareaFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  registration: UseFormRegisterReturn;
};

function TextareaField({ id, label, hint, error, required, registration }: TextareaFieldProps) {
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        rows={4}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, !!hint, !!error)}
        className={controlClass(!!error)}
        {...registration}
      />
    </FieldWrap>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  required?: boolean;
  registration: UseFormRegisterReturn;
};

function SelectField({ id, label, options, error, required, registration }: SelectFieldProps) {
  return (
    <FieldWrap id={id} label={label} error={error} required={required}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, false, !!error)}
        className={controlClass(!!error)}
        {...registration}
      >
        <option value="">Choose one</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

type RadioGroupProps = {
  legend: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  required?: boolean;
  registration: UseFormRegisterReturn;
  layout?: 'stack' | 'row';
};

function RadioGroup({
  legend,
  options,
  error,
  required,
  registration,
  layout = 'stack',
}: RadioGroupProps) {
  const groupId = `field-${registration.name}`;
  const errorId = `${groupId}-error`;
  return (
    <fieldset>
      <legend className="block text-sm font-medium">
        {legend}
        {required ? <span className="text-muted"> (required)</span> : null}
      </legend>
      <div className={layout === 'row' ? 'mt-2 flex flex-wrap gap-3' : 'mt-2 grid gap-2.5'}>
        {options.map((option) => {
          const id = `${groupId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className="rounded-brand border-line has-[:checked]:border-accent has-[:checked]:bg-surface flex items-center gap-2.5 border px-3.5 py-2.5 text-sm"
            >
              <input
                id={id}
                type="radio"
                value={option.value}
                required={required}
                aria-describedby={error ? errorId : undefined}
                className="accent-accent size-4"
                {...registration}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-accent mt-1.5 text-sm font-medium">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export type Props = { siteKey: string };

export default function LeadForm({ siteKey }: Props) {
  const startedAtRef = useRef(Date.now());
  const turnstileHostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const tokenRef = useRef('');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // leadSchema is a discriminated union keyed on `path`; FormValues is a flat superset of both branches
    // (one form, two sets of fields). The cast is safe: at runtime safeParse only reads the fields the
    // chosen branch needs and ignores the rest, so validation still matches the server exactly.
    resolver: zodResolver(leadSchema) as unknown as Resolver<FormValues>,
    defaultValues,
  });

  const path = watch('path');
  const currency = watch('currency');

  // Pre-fill from the URL and locale after mount only, so the server-rendered and first client-rendered
  // markup match (no hydration mismatch), then this nudges the form once the browser APIs are available.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('path');
    if (requested === 'role' || requested === 'project') setValue('path', requested);
    if (typeof navigator !== 'undefined' && navigator.language?.includes('IN')) {
      setValue('currency', 'INR');
    }
  }, [setValue]);

  // A band from the other currency would fail validation, so start the budget choice again.
  useEffect(() => {
    setValue('budget', '');
  }, [currency, setValue]);

  // The widget's container only exists once a path is chosen, so render it then (once per mount).
  const hasPath = path === 'project' || path === 'role';
  useEffect(() => {
    if (!hasPath) return;
    let cancelled = false;
    const clearToken = () => {
      tokenRef.current = '';
    };
    loadTurnstile()
      .then(() => {
        const host = turnstileHostRef.current;
        if (cancelled || !host || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(host, {
          sitekey: siteKey,
          action: 'lead',
          callback: (token) => {
            tokenRef.current = token;
          },
          // Tokens last 5 minutes; the widget refreshes itself and calls `callback` again.
          'expired-callback': clearToken,
          'error-callback': clearToken,
        });
      })
      .catch(() => {
        // No token is captured; the server-side Turnstile check then fails and the visitor sees the
        // form-level error with the email fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [hasPath, siteKey]);

  const resetTurnstile = () => {
    tokenRef.current = '';
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const attribution = readAttribution();
    const payload: Record<string, unknown> = {
      path: values.path,
      name: values.name,
      email: values.email,
      company: values.company,
      consent: values.consent,
      ...attribution,
      'cf-turnstile-response': tokenRef.current,
      website: values.website,
      started_at: startedAtRef.current,
    };
    if (values.path === 'project') {
      Object.assign(payload, {
        service: values.service,
        currency: values.currency,
        budget: values.budget,
        timeline: values.timeline,
        message: values.message,
      });
    } else if (values.path === 'role') {
      Object.assign(payload, {
        role_title: values.role_title,
        work_mode: values.work_mode,
        job_url: values.job_url,
        message: values.message,
      });
    }

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        window.location.assign(`/thanks?path=${values.path}`);
        return;
      }
      const data = (await response.json().catch(() => ({}))) as LeadErrorBody;
      if (response.status === 400 && data.error === 'invalid' && data.fields) {
        for (const [field, message] of Object.entries(data.fields)) {
          if (field in defaultValues)
            setError(field as keyof FormValues, { type: 'server', message });
        }
        resetTurnstile();
        return;
      }
      setFormError(errorCopyFor(data.error));
      resetTurnstile();
    } catch {
      setFormError(formCopy.errors.unavailable);
      resetTurnstile();
    }
  });

  const budgetOptions = budgetBands[currency];

  return (
    <form noValidate onSubmit={onSubmit} className="grid max-w-xl gap-6" aria-label="Contact form">
      <RadioGroup
        legend={formCopy.pathLegend}
        options={leadPaths}
        required
        error={errors.path ? formCopy.pathError : undefined}
        registration={register('path')}
        layout="row"
      />

      {hasPath && (
        <>
          <TextField
            id="lead-name"
            label={formCopy.labels.name}
            required
            autoComplete="name"
            error={errors.name?.message}
            registration={register('name')}
          />
          <TextField
            id="lead-email"
            label={formCopy.labels.email}
            type="email"
            required
            autoComplete="email"
            error={errors.email?.message}
            registration={register('email')}
          />
          <TextField
            id="lead-company"
            label={formCopy.labels.company}
            required={path === 'role'}
            autoComplete="organization"
            error={errors.company?.message}
            registration={register('company')}
          />

          {path === 'project' && (
            <>
              <SelectField
                id="lead-service"
                label={formCopy.labels.service}
                required
                options={serviceOptions}
                error={errors.service?.message}
                registration={register('service')}
              />
              <RadioGroup
                legend={formCopy.labels.currency}
                options={currencies}
                error={errors.currency?.message}
                registration={register('currency')}
                layout="row"
              />
              <SelectField
                id="lead-budget"
                label={formCopy.labels.budget}
                required
                options={budgetOptions}
                error={errors.budget?.message}
                registration={register('budget')}
              />
              <SelectField
                id="lead-timeline"
                label={formCopy.labels.timeline}
                required
                options={timelines}
                error={errors.timeline?.message}
                registration={register('timeline')}
              />
              <TextareaField
                id="lead-message"
                label={formCopy.labels.message}
                required
                hint={formCopy.hints.message}
                error={errors.message?.message}
                registration={register('message')}
              />
            </>
          )}

          {path === 'role' && (
            <>
              <TextField
                id="lead-role-title"
                label={formCopy.labels.roleTitle}
                required
                error={errors.role_title?.message}
                registration={register('role_title')}
              />
              <SelectField
                id="lead-work-mode"
                label={formCopy.labels.workMode}
                required
                options={workModes}
                error={errors.work_mode?.message}
                registration={register('work_mode')}
              />
              <TextField
                id="lead-job-url"
                label={formCopy.labels.jobUrl}
                type="url"
                hint={formCopy.hints.jobUrl}
                error={errors.job_url?.message}
                registration={register('job_url')}
              />
              <TextareaField
                id="lead-role-message"
                label={formCopy.labels.roleMessage}
                error={errors.message?.message}
                registration={register('message')}
              />
            </>
          )}

          <div>
            <label htmlFor="lead-consent" className="flex items-start gap-2.5 text-sm">
              <input
                id="lead-consent"
                type="checkbox"
                required
                className="accent-accent mt-0.5 size-4"
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? 'lead-consent-error' : undefined}
                {...register('consent')}
              />
              <span>
                {formCopy.consentPrefix}
                <a className="link" href="/privacy">
                  {formCopy.consentLinkText}
                </a>
                .
              </span>
            </label>
            {errors.consent && (
              <p id="lead-consent-error" className="text-accent mt-1.5 text-sm font-medium">
                {errors.consent.message}
              </p>
            )}
          </div>

          {/* Honeypot: hidden from people, filled in by naive bots. Never shown, never focusable. */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="lead-website">{formCopy.labels.honeypot}</label>
            <input
              id="lead-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register('website')}
            />
          </div>

          <div ref={turnstileHostRef} />

          {formError && (
            <p
              role="alert"
              className="rounded-brand border-accent text-accent border px-4 py-3 text-sm"
            >
              {formError}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-brand bg-accent text-on-accent hover:bg-ink hover:text-bg inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? formCopy.submitting : formCopy.submit}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
