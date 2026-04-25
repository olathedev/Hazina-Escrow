// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { I18nProvider } from "./i18n";

expect.extend(toHaveNoViolations);

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("hazina-tour-completed", "true");
  Object.defineProperty(window, "scrollTo", {
    value: vi.fn(),
    writable: true,
  });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network disabled in test"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Accessibility tests", () => {
  test("App should have no accessibility violations", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <App />
          </I18nProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
