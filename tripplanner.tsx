import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Globe2 } from "lucide-react";
import { generateItinerary } from "@/lib/travel.functions";
import type { GenerateResult, TripInput } from "@/lib/trip-schema";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { TripForm } from "@/components/travel/TripForm";
import { RatesWidget } from "@/components/travel/RatesWidget";
import { ItineraryView } from "@/components/travel/ItineraryView";
import { EmptyState, LoadingState } from "@/components/travel/States";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Driftline — AI Travel Itinerary & Budget Explorer" },
      {
        name: "description",
        content: "Day-by-day AI travel itineraries for Indian travellers, with realistic food, stay and transport costs in USD and INR at live rates.",
      },
      { property: "og:title", content: "Driftline — AI Travel Itinerary & Budget Explorer" },
      {
        property: "og:description",
        content: "AI trip plans for Indian travellers with veg-only options and live USD/INR budgets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const generate = useServerFn(generateItinerary);
  const { data: fx } = useExchangeRates();
  const [currency, setCurrency] = useState("USD");
  const [lastInput, setLastInput] = useState<TripInput | null>(null);

  const mutation = useMutation({
    mutationFn: (input: TripInput) => generate({ data: input }) as Promise<GenerateResult>,
    onSuccess: (res) => {
      if (res.ok) {
        const code = res.itinerary.destination.currencyCode;
        setCurrency(fx?.rates[code] ? code : "USD");
      }
    },
  });

  const result = mutation.data;
  const itinerary = result?.ok ? result.itinerary : null;
  const errorMsg = mutation.isError ? "Couldn't reach the planner. Check your connection and try again." : result && !result.ok ? result.error : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-aurora" />
        <div className="absolute inset-0 grid-fade" />
        <div className="absolute -left-32 top-1/3 size-[28rem] rounded-full bg-accent/10 blur-3xl animate-float-slow" />
        <div className="absolute -right-24 top-2/3 size-[24rem] rounded-full bg-coral/10 blur-3xl animate-float-slower" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Globe2 className="size-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Driftline</span>
        </div>
        <span className="glass hidden rounded-full px-3 py-1 text-xs text-muted-foreground sm:inline">AI itinerary & budget explorer</span>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-8 max-w-3xl sm:mb-10">
          <h1 className="text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Plan the trip. <span className="text-gradient">Know the cost.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Day-by-day AI itineraries for Indian travellers — street-smart food, real travel costs, and every rupee totalled at today's live rate.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr]">
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <TripForm
              loading={mutation.isPending}
              onSubmit={(input) => {
                setLastInput(input);
                mutation.mutate(input);
                if (window.innerWidth < 1024) {
                  requestAnimationFrame(() =>
                    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }
              }}
            />
            <RatesWidget
              currency={currency}
              onCurrencyChange={setCurrency}
              destinationCurrency={itinerary?.destination.currencyCode}
            />
          </aside>

          <section id="results" aria-label="Itinerary" className="min-w-0 scroll-mt-4">
            {mutation.isPending && lastInput ? (
              <LoadingState city={lastInput.city} />
            ) : errorMsg ? (
              <div className="glass flex flex-col items-center rounded-3xl p-8 text-center">
                <AlertTriangle className="size-8 text-destructive" />
                <p className="mt-3 font-semibold">{errorMsg}</p>
                {lastInput && (
                  <button
                    type="button"
                    onClick={() => mutation.mutate(lastInput)}
                    className="mt-4 rounded-xl border border-glass-border px-4 py-2 text-sm transition hover:bg-glass-strong"
                  >
                    Try again
                  </button>
                )}
              </div>
            ) : itinerary && lastInput ? (
              <ItineraryView
                itinerary={itinerary}
                currency={currency}
                rates={fx?.rates}
                vibe={lastInput.vibe}
                budget={lastInput.budget}
                origin={lastInput.origin}
                vegOnly={lastInput.vegOnly}
              />
            ) : (
              <EmptyState />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
