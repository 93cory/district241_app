export const e2ePasswords = {
  admin: process.env.PNPI_E2E_ADMIN_PASSWORD ?? "Demo1234!@#$",
  ministre: process.env.PNPI_E2E_MINISTRE_PASSWORD ?? "Demo1234!@#$",
  directeur: process.env.PNPI_E2E_DIRECTEUR_PASSWORD ?? "Demo1234!@#$",
  instructeur: process.env.PNPI_E2E_INSTRUCTEUR_PASSWORD ?? "Demo1234!@#$",
  inspecteur: process.env.PNPI_E2E_INSPECTEUR_PASSWORD ?? "Demo1234!@#$",
  operateur: process.env.PNPI_E2E_OPERATEUR_PASSWORD ?? "Demo1234!@#$",
} as const;
