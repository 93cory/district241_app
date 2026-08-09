import { requireInstitutionAccess } from "./_components/access";

export default async function InstitutionsLayout({ children }: { children: React.ReactNode }) {
  await requireInstitutionAccess();
  return children;
}
