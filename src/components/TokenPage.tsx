// Dev-only design-token reference (task 1.3.4).
// Rendered by App under ?dev=tokens and only when import.meta.env.DEV is true.
// The swatch colours come from CSS vars — no literal colours (see the 1.3.3 guard).

import { FONT_PROPERTY_BY_NAME, fontTokens, sizeTokens, tokenSwatches } from "./tokenData";

/** The full parsed token list (used for motion copy). */
import { allTokens } from "./tokenData";

function SectionHeading({ children }: { children: string }) {
  return <h2 style={{ fontFamily: "var(--font-ui)" }}>{children}</h2>;
}

export function TokenPage() {
  return (
    <main className="token-page">
      <h1>Design tokens (dev)</h1>

      <section>
        <SectionHeading>Colours</SectionHeading>
        <ul className="token-list">
          {tokenSwatches.map(({ name, value }) => (
            <li key={name}>
              <span
                className="swatch"
                style={{ backgroundColor: `var(${name})` }}
                data-testid="token-swatch"
                aria-label={`swatch for ${name}`}
              />
              <code>{name}</code>
              <code>{value}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading>Fonts</SectionHeading>
        <ul className="token-list">
          {fontTokens.map(({ name, value }) => (
            <li key={name}>
              <span style={{ fontFamily: FONT_PROPERTY_BY_NAME[name], fontSize: "20px" }}>
                {value}
              </span>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading>Type sizes</SectionHeading>
        <ul className="token-list">
          {sizeTokens.map(({ name, value }) => (
            <li key={name}>
              <span style={{ fontSize: `var(${name})` }}>{value}</span>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading>Shape, spacing, motion</SectionHeading>
        <p>
          <span
            style={{
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border-card)",
              padding: "var(--space-2)",
            }}
          >
            12px radius card
          </span>
        </p>
        <div data-testid="radius-example" style={{ borderRadius: "var(--radius)" }}>
          --radius example: 12px
        </div>
        <div data-testid="spacing-example" style={{ marginTop: "var(--space-2)" }}>
          spacing tokens: 8 / 16 / 24 / 32 / 48 — this block is 16px below the radius card
        </div>
        <p>motion: {allTokens.find((t) => t.name === "--motion-fade")?.value} fade only</p>
      </section>
    </main>
  );
}
