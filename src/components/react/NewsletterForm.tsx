// Newsletter sign-up (#111): email + consent, posted to /api/subscribe (double opt-in, #109). Used on
// /checklist and as the "Just following along" path of LeadForm. Validates with the same schema as the
// endpoint; the endpoint answers { ok: true } whether or not the address is already on the list.
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { newsletterCopy } from '../../data/subscribe';
import { subscribeSchema, type subscribeSources } from '../../lib/subscribe';
import { track } from '../../lib/track';
import {
  ConsentField,
  errorCopyFor,
  FormAlert,
  Honeypot,
  submissionContext,
  submitClass,
  TextField,
  useTurnstile,
  type FormErrorBody,
} from './formParts';

type FormValues = { email: string; consent: boolean; website: string };

// The client checks only what the visitor types; `source` and the rest are added on submit.
const clientSchema = subscribeSchema.pick({ email: true, consent: true });

type Props = {
  source: (typeof subscribeSources)[number];
  /** `lead_path` on form_start: "checklist", or "following" inside the /contact form. */
  analyticsPath: string;
  /** Prefix for element ids, so two forms on one page never clash. */
  idPrefix?: string;
};

export default function NewsletterForm({ source, analyticsPath, idPrefix = 'newsletter' }: Props) {
  const [startedAt] = useState(() => Date.now());
  const startedRef = useRef(false);
  const successRef = useRef<HTMLHeadingElement | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    hostRef: turnstileHostRef,
    token: turnstileToken,
    reset: resetTurnstile,
  } = useTurnstile(sentTo === null, 'subscribe');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // raw: submit the values as typed, including the honeypot, which the schema doesn't know about;
    // the endpoint trims and lowercases. The cast: FormValues is the form's shape, wider than the schema.
    resolver: zodResolver(clientSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<FormValues>,
    defaultValues: { email: '', consent: false, website: '' },
  });

  useEffect(() => {
    if (sentTo) successRef.current?.focus();
  }, [sentTo]);

  const onFirstInput = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    track({ name: 'form_start', params: { lead_path: analyticsPath } });
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const payload = {
      email: values.email,
      consent: values.consent,
      source,
      ...submissionContext(),
      'cf-turnstile-response': await turnstileToken(),
      website: values.website,
      started_at: startedAt,
    };
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setSentTo(values.email.trim());
        return;
      }
      const data = (await response.json().catch(() => ({}))) as FormErrorBody;
      if (response.status === 400 && data.error === 'invalid' && data.fields) {
        for (const [field, message] of Object.entries(data.fields)) {
          if (field === 'email' || field === 'consent')
            setError(field, { type: 'server', message });
        }
        // Only fields the visitor can't see failed (e.g. source): show the general error instead.
        if (!('email' in data.fields) && !('consent' in data.fields)) {
          setFormError(newsletterCopy.errors.generic);
        }
      } else {
        setFormError(errorCopyFor(data.error, newsletterCopy.errors));
      }
      resetTurnstile();
    } catch {
      setFormError(newsletterCopy.errors.unavailable);
      resetTurnstile();
    }
  });

  if (sentTo) {
    const [before, after] = newsletterCopy.success.body.split('{email}');
    return (
      <div role="status" className="grid gap-3">
        <h3 ref={successRef} tabIndex={-1} className="text-h3 focus:outline-none">
          {newsletterCopy.success.heading}
        </h3>
        <p className="text-muted">
          {before}
          <strong className="text-ink font-medium break-all">{sentTo}</strong>
          {after}
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onInput={onFirstInput}
      className="grid gap-5"
      aria-label="Newsletter sign-up"
    >
      <TextField
        id={`${idPrefix}-email`}
        label={newsletterCopy.labels.email}
        type="email"
        required
        autoComplete="email"
        error={errors.email?.message}
        registration={register('email')}
      />
      <ConsentField
        id={`${idPrefix}-consent`}
        prefix={newsletterCopy.consentPrefix}
        linkText={newsletterCopy.consentLinkText}
        error={errors.consent?.message}
        registration={register('consent')}
      />
      <Honeypot
        id={`${idPrefix}-website`}
        label={newsletterCopy.labels.honeypot}
        registration={register('website')}
      />

      <div ref={turnstileHostRef} />

      {formError && <FormAlert>{formError}</FormAlert>}

      <div>
        <button type="submit" disabled={isSubmitting} className={submitClass}>
          {isSubmitting ? newsletterCopy.submitting : newsletterCopy.submit}
        </button>
      </div>
    </form>
  );
}
