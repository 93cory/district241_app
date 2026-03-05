# Runbook Demo PNPI (5-7 minutes)

## Preparation (avant la salle)
1. Initialiser les donnees demo:
   - `powershell -ExecutionPolicy Bypass -File scripts/prepare_demo.ps1`
2. Lancer backend:
   - `backend\.venv312\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload`
3. Lancer frontend:
   - `cd frontend`
   - `npm run dev`
4. Ouvrir les pages:
   - Dashboard: `http://localhost:3000/`
   - Admin: `http://localhost:3000/admin`
   - Briefing: `http://localhost:3000/briefing`

## Script minute par minute
### 0:00 - 0:45 | Contexte national
- Message: "PNPI transforme la politique industrielle en pilotage base sur la preuve."
- Insister sur souverainete economique, import substitution, emplois.

### 0:45 - 2:15 | Dashboard strategique
- Montrer KPI: indice, ecart import, emplois, unites/zones actives, lots traces.
- Montrer alertes prioritaires colorees.
- Expliquer que les chiffres viennent des declarations et lots traces en base.

### 2:15 - 3:30 | Administration et controle
- Aller sur `/admin`.
- Creer une notification de controle.
- Valider une declaration en attente.
- Montrer la mise a jour immediate.

### 3:30 - 4:30 | Traçabilite et preuve terrain
- Retour dashboard.
- Montrer lots traces + export CSV/PDF.
- Expliquer usage mobile inspecteur (scan QR + declaration terrain).

### 4:30 - 6:00 | Briefing ministeriel
- Ouvrir `/briefing`.
- Parcourir baseline 2026 vs cible 2028.
- Montrer plan 30/60/90 jours et annexes KPI.
- Cliquer "Imprimer briefing" ou "Export PDF ministeriel".

### 6:00 - 7:00 | Conclusion impact
- "PNPI offre une chaine complete: collecte terrain -> validation -> pilotage national."
- "Effets attendus: baisse importations, hausse valeur locale, emplois et PIB non petrolier."

## Messages clefs a marteler
- Donnee verifiable -> decision plus rapide.
- Traçabilite lot par lot -> lutte anti-informel.
- Tableau unique ministeriel -> gouvernance et redevabilite.

