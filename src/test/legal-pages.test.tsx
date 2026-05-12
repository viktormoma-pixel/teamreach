import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/i18n";
import Privacy from "@/pages/Privacy";
import Impressum from "@/pages/Impressum";

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>,
  );

describe("Legal pages", () => {
  it("Impressum renders owner info and § 5 TMG block", () => {
    renderWithProviders(<Impressum />);
    expect(screen.getByRole("heading", { level: 1, name: /impressum/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Moma Viktor/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sudetenstraße 17/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hagelstadt/).length).toBeGreaterThan(0);
    expect(screen.getByText(/viktormoma@gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText(/§ ?19 UStG/)).toBeInTheDocument();
  });

  it("Privacy renders GDPR sections and controller info", () => {
    renderWithProviders(<Privacy />);
    expect(
      screen.getByRole("heading", { level: 1, name: /privacy|datenschutz|конфиденциальности/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Moma Viktor/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Supabase/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vercel/).length).toBeGreaterThan(0);
    expect(screen.getByText(/BayLDA/)).toBeInTheDocument();
  });
});
