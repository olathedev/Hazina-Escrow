// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, test, describe } from 'vitest';
import App from './App';


import { HelmetProvider } from 'react-helmet-async';

expect.extend(toHaveNoViolations);

describe('Accessibility tests', () => {
  test('App should have no accessibility violations', async () => {
    const { container } = render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
