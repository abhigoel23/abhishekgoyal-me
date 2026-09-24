// The /contact form. Validates with src/lib/lead.ts (the same schema POST /api/lead uses), so a client
// error and a server error always say the same thing. The "Just following along" path renders
// NewsletterForm instead (#111). Anti-bot fields (Turnstile, honeypot, timing) are
// read by src/lib/server/leadHandler.ts.
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver, type UseFormRegisterReturn } from 'react-hook-form';
import {
  budgetBands,
  contactPaths,
  currencies,
  formCopy,
  serviceOptions,
  timelines,
  workModes,
} from '../../data/lead';
import { followingCopy } from '../../data/subscribe';
import { leadSchema } from '../../lib/lead';
import { track } from '../../lib/track';
import {
  ConsentField,
  describedBy,
  errorCopyFor,
  FieldWrap,
  FormAlert,
  Honeypot,
  submissionContext,
  submitClass,
  TextField,
  controlClass,
  useTurnstile,
  type FormErrorBody,
} from './formParts';
import NewsletterForm from './NewsletterForm';

type Path = '' | 'project' | 'role' | 'following';
type Currency = (typeof currencies)[number]['value'];

// A flat superset of both branches of leadSchema's discriminated union: react-hook-form needs one shape
// to bind inputs to, and only the fields for the chosen `path` are required (leadSchema enforces that).
// "following" isn't a lead: that path renders NewsletterForm instead, which posts to /api/subscribe.
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

export default function LeadForm() {
  const startedAtRef = useRef(Date.now());
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
    // raw: submit the values as typed, including the honeypot, which the schema doesn't know about.
    resolver: zodResolver(leadSchema, undefined, { raw: true }) as unknown as Resolver<FormValues>,
    defaultValues,
  });

  const path = watch('path');
  const currency = watch('currency');

  // Pre-fill from the URL and locale after mount only, so the server-rendered and first client-rendered
  // markup match (no hydration mismatch), then this nudges the form once the browser APIs are available.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // A radio clicked before hydration (slow network) is already checked in the DOM; keep that choice.
    const clicked = document.querySelector<HTMLInputElement>('input[name="path"]:checked')?.value;
    const requested = clicked ?? params.get('path');
    if (requested === 'role' || requested === 'project' || requested === 'following') {
      setValue('path', requested);
    }
    if (typeof navigator !== 'undefined' && navigator.language?.includes('IN')) {
      setValue('currency', 'INR');
    }
  }, [setValue]);

  // A band from the other currency would fail validation, so start the budget choice again.
  useEffect(() => {
    setValue('budget', '');
  }, [currency, setValue]);

  // The widget's container only exists once a lead path is chosen, so render it then.
  const hasPath = path === 'project' || path === 'role';
  const {
    hostRef: turnstileHostRef,
    token: turnstileToken,
    reset: resetTurnstile,
  } = useTurnstile(hasPath, 'lead');

  // Funnel events: which path was chosen, and the first time someone starts filling it in.
  const startedRef = useRef(false);
  useEffect(() => {
    if (path) track({ name: 'form_step', params: { lead_path: path } });
  }, [path]);
  const onFirstInput = () => {
    if (startedRef.current || !hasPath) return;
    startedRef.current = true;
    track({ name: 'form_start', params: { lead_path: path } });
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload: Record<string, unknown> = {
      path: values.path,
      name: values.name,
      email: values.email,
      company: values.company,
      consent: values.consent,
      ...submissionContext(),
      'cf-turnstile-response': await turnstileToken(),
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
      const data = (await response.json().catch(() => ({}))) as FormErrorBody;
      if (response.status === 400 && data.error === 'invalid' && data.fields) {
        for (const [field, message] of Object.entries(data.fields)) {
          if (field in defaultValues)
            setError(field as keyof FormValues, { type: 'server', message });
        }
        resetTurnstile();
        return;
      }
      setFormError(errorCopyFor(data.error, formCopy.errors));
      resetTurnstile();
    } catch {
      setFormError(formCopy.errors.unavailable);
      resetTurnstile();
    }
  });

  const budgetOptions = budgetBands[currency];

  return (
    <div className="grid max-w-xl gap-6">
      <RadioGroup
        legend={formCopy.pathLegend}
        options={contactPaths}
        required
        error={errors.path ? formCopy.pathError : undefined}
        registration={register('path')}
        layout="row"
      />

      {path === 'following' && (
        <div className="grid gap-5">
          <p className="text-muted">{followingCopy}</p>
          <NewsletterForm source="lead_form" analyticsPath="following" idPrefix="following" />
        </div>
      )}

      {hasPath && (
        <form
          noValidate
          onSubmit={onSubmit}
          onInput={onFirstInput}
          className="grid gap-6"
          aria-label="Contact form"
        >
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

          <ConsentField
            id="lead-consent"
            prefix={formCopy.consentPrefix}
            linkText={formCopy.consentLinkText}
            error={errors.consent?.message}
            registration={register('consent')}
          />

          <Honeypot
            id="lead-website"
            label={formCopy.labels.honeypot}
            registration={register('website')}
          />

          <div ref={turnstileHostRef} />

          {formError && <FormAlert>{formError}</FormAlert>}

          <div>
            <button type="submit" disabled={isSubmitting} className={submitClass}>
              {isSubmitting ? formCopy.submitting : formCopy.submit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
