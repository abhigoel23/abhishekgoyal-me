import { describe, expect, it } from 'vitest';
import { leadSchema, limits } from './lead';

const project = {
  path: 'project',
  name: ' Asha ',
  email: 'Asha@Example.com',
  consent: true,
  service: 'mvp',
  currency: 'INR',
  budget: 'inr-4-12l',
  timeline: '1-3m',
  message: 'A booking app for clinics.',
  company: '',
};

const role = {
  path: 'role',
  name: 'Ravi',
  email: 'ravi@example.com',
  consent: true,
  company: 'Acme',
  role_title: 'Staff Android Engineer',
  work_mode: 'remote',
  job_url: 'https://acme.example/jobs/1',
};

const errorPaths = (input: unknown) =>
  leadSchema.safeParse(input).error?.issues.map((i) => i.path.join('.')) ?? [];

describe('leadSchema', () => {
  it('accepts a project lead and normalises it', () => {
    const lead = leadSchema.parse(project);
    expect(lead).toMatchObject({ name: 'Asha', email: 'asha@example.com', company: undefined });
  });

  it('accepts a role lead without a message', () => {
    expect(leadSchema.parse(role).message).toBeUndefined();
  });

  it('rejects an unknown path', () => {
    expect(leadSchema.safeParse({ ...project, path: 'newsletter' }).success).toBe(false);
  });

  it('requires consent to be true', () => {
    expect(errorPaths({ ...project, consent: false })).toEqual(['consent']);
    expect(errorPaths({ ...project, consent: 'true' })).toEqual(['consent']);
  });

  it('rejects a budget band from the other currency', () => {
    expect(errorPaths({ ...project, currency: 'USD' })).toEqual(['budget']);
  });

  it('rejects values not in the option lists', () => {
    expect(errorPaths({ ...project, service: 'web', timeline: 'never' })).toEqual([
      'service',
      'timeline',
    ]);
    expect(errorPaths({ ...role, work_mode: 'moon' })).toEqual(['work_mode']);
  });

  it('requires path-specific fields', () => {
    expect(errorPaths({ ...project, message: '  ' })).toEqual(['message']);
    expect(errorPaths({ ...role, company: '', role_title: undefined })).toEqual([
      'company',
      'role_title',
    ]);
  });

  it('rejects invalid emails and non-http job links', () => {
    expect(errorPaths({ ...project, email: 'not-an-email' })).toEqual(['email']);
    expect(errorPaths({ ...role, job_url: 'javascript:alert(1)' })).toEqual(['job_url']);
  });

  it('enforces maximum lengths', () => {
    expect(errorPaths({ ...project, name: 'a'.repeat(limits.name + 1) })).toEqual(['name']);
    expect(errorPaths({ ...project, message: 'a'.repeat(limits.message + 1) })).toEqual([
      'message',
    ]);
  });

  it('drops a malformed GA client id instead of failing the lead', () => {
    expect(leadSchema.parse({ ...project, ga_client_id: 'x' }).ga_client_id).toBeUndefined();
    expect(leadSchema.parse({ ...project, ga_client_id: '123.456' }).ga_client_id).toBe('123.456');
  });

  it('strips unknown keys', () => {
    expect(leadSchema.parse({ ...role, is_admin: true })).not.toHaveProperty('is_admin');
  });
});
