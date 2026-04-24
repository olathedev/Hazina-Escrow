// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, test, describe } from 'vitest';
import App from './App';


expect.extend(toHaveNoViolations);

describe('Accessibility tests', () => {
  test('App should have no accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
