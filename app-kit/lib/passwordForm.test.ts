import { describe, expect, it } from 'vitest';
import { validateAccountForm } from './passwordForm';

const good = { digits: '9876543210', name: 'Asha', password: 'long-enough-1' };

describe('validateAccountForm', () => {
  it('accepts a complete login and sign up', () => {
    expect(validateAccountForm('login', good)).toEqual({});
    expect(validateAccountForm('signup', good)).toEqual({});
  });

  it('login needs only a number and a password (any length, the server decides)', () => {
    expect(validateAccountForm('login', { digits: '9876543210', name: '', password: 'x' })).toEqual(
      {},
    );
    expect(validateAccountForm('login', { ...good, password: '' }).password).toBeTruthy();
    expect(validateAccountForm('login', { ...good, digits: '123' }).phone).toBeTruthy();
  });

  it('sign up also needs a name and a password of at least 8 characters', () => {
    expect(validateAccountForm('signup', { ...good, name: '   ' }).name).toBeTruthy();
    expect(validateAccountForm('signup', { ...good, password: 'short' }).password).toContain('8');
    expect(validateAccountForm('signup', { ...good, password: '12345678' })).toEqual({});
  });

  it('reports every problem at once', () => {
    expect(validateAccountForm('signup', { digits: '', name: '', password: '' })).toEqual({
      phone: expect.any(String),
      name: expect.any(String),
      password: expect.any(String),
    });
  });
});
