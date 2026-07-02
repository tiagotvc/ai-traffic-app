const CARD_BRANDS = [
  { name: "Visa", file: "visa.svg" },
  { name: "Mastercard", file: "mastercard.svg" },
  { name: "Elo", file: "elo.svg" },
  { name: "American Express", file: "american-express.svg" }
] as const;

/** Bandeiras aceitas, usando os SVGs oficiais normalizados do Simple Icons. */
export function PaymentBrandMarks() {
  return (
    <span className="flex items-center gap-3" aria-label="Bandeiras aceitas">
      {CARD_BRANDS.map((brand) => (
        <span
          key={brand.file}
          title={brand.name}
          className="flex h-10 w-16 items-center justify-center overflow-hidden p-0.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://cdn.jsdelivr.net/gh/datatrans/payment-logos@master/assets/cards/${brand.file}`}
            alt={brand.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </span>
      ))}
    </span>
  );
}
