# 🎨 Vayu | Local AI Journal App

> A product of soupapps

## 1. Colors

The color system is defined by scales from 50 (lightest) to 950 (darkest), alongside semantic colors for specific intents.

### Primary

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#f6f9f7` | `--color-primary-50` |
| 100 | `#edf3ef` | `--color-primary-100` |
| 200 | `#d5e2da` | `--color-primary-200` |
| 300 | `#b5cfbe` | `--color-primary-300` |
| 400 | `#89b398` | `--color-primary-400` |
| 500 | `#659a78` | `--color-primary-500` |
| 600 | `#558165` | `--color-primary-600` |
| 700 | `#456952` | `--color-primary-700` |
| 800 | `#35503f` | `--color-primary-800` |
| 900 | `#2a3c31` | `--color-primary-900` |
| 950 | `#152019` | `--color-primary-950` |

### Secondary

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#f6f7f9` | `--color-secondary-50` |
| 100 | `#edeff2` | `--color-secondary-100` |
| 200 | `#d6dbe1` | `--color-secondary-200` |
| 300 | `#b7c1cd` | `--color-secondary-300` |
| 400 | `#8c9cb0` | `--color-secondary-400` |
| 500 | `#697d96` | `--color-secondary-500` |
| 600 | `#58697e` | `--color-secondary-600` |
| 700 | `#475566` | `--color-secondary-700` |
| 800 | `#37414e` | `--color-secondary-800` |
| 900 | `#2b323b` | `--color-secondary-900` |
| 950 | `#15191e` | `--color-secondary-950` |

### Accent

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#f5faf7` | `--color-accent-50` |
| 100 | `#eaf5ef` | `--color-accent-100` |
| 200 | `#cfe8d9` | `--color-accent-200` |
| 300 | `#a9d9bc` | `--color-accent-300` |
| 400 | `#77c596` | `--color-accent-400` |
| 500 | `#4eb176` | `--color-accent-500` |
| 600 | `#429563` | `--color-accent-600` |
| 700 | `#357850` | `--color-accent-700` |
| 800 | `#295c3d` | `--color-accent-800` |
| 900 | `#224430` | `--color-accent-900` |
| 950 | `#162c1f` | `--color-accent-950` |

### Neutral

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#f7f7f8` | `--color-neutral-50` |
| 100 | `#eef0f1` | `--color-neutral-100` |
| 200 | `#d8dbde` | `--color-neutral-200` |
| 300 | `#bcc1c7` | `--color-neutral-300` |
| 400 | `#959da7` | `--color-neutral-400` |
| 500 | `#7e8793` | `--color-neutral-500` |
| 600 | `#626a75` | `--color-neutral-600` |
| 700 | `#4f565e` | `--color-neutral-700` |
| 800 | `#3c4248` | `--color-neutral-800` |
| 900 | `#2f3237` | `--color-neutral-900` |
| 950 | `#1f2124` | `--color-neutral-950` |

### Semantic Intents

| Intent | Hex | Token Variable |
|--------|-----|----------------|
| Success | `#22c55e` | `--color-success` |
| Warning | `#f59e0b` | `--color-warning` |
| Error   | `#ef4444` | `--color-error` |

## 2. Typography

### Font Families

- **Sans (Body):** `DM Sans`
- **Display (Headings):** `Fraunces`
- **Mono (Code):** `DM Mono`

### Font Sizes

| Scale | Value | Token Variable |
|-------|-------|----------------|
| xs | `0.563rem` | `--font-size-xs` |
| base | `0.688rem` | `--font-size-base` |
| xl | `0.813rem` | `--font-size-xl` |
| 2xl | `1rem` | `--font-size-2xl` |
| 4xl | `1.25rem` | `--font-size-4xl` |
| sm | `0.625rem` | `--font-size-sm` |
| lg | `0.75rem` | `--font-size-lg` |
| 3xl | `1.125rem` | `--font-size-3xl` |

### Font Weights

| Name | Weight | Token Variable |
|------|--------|----------------|
| normal | `400` | `--font-weight-normal` |
| medium | `500` | `--font-weight-medium` |
| semibold | `600` | `--font-weight-semibold` |
| bold | `700` | `--font-weight-bold` |

## 3. Spacing & Sizing

| Scale | Value | Token Variable |
|-------|-------|----------------|
| 0 | `0` | `--spacing-0` |
| 1 | `0.125rem` | `--spacing-1` |
| 2 | `0.375rem` | `--spacing-2` |
| 3 | `0.625rem` | `--spacing-3` |
| 4 | `0.875rem` | `--spacing-4` |
| 6 | `1.375rem` | `--spacing-6` |

## 4. Borders & Shadows

### Border Radius

| Name | Value | Token Variable |
|------|-------|----------------|
| none | `0` | `--radius-none` |
| sm | `0.25rem` | `--radius-sm` |
| md | `0.375rem` | `--radius-md` |
| lg | `50%` | `--radius-lg` |
| xl | `0.75rem` | `--radius-xl` |
| 2xl | `1rem` | `--radius-2xl` |
| full | `9999px` | `--radius-full` |

### Shadows

| Name | Value | Token Variable |
|------|-------|----------------|
| sm | `rgba(120, 190, 153, 0.086) 0px 0px 0px 4px` | `--shadow-sm` |
| md | `rgb(67, 114, 85) 0px 0px 0px 1px inset` | `--shadow-md` |
| lg | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | `--shadow-lg` |
| xl | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | `--shadow-xl` |
