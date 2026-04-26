# Anticipation des questions du Cabinet — Adversarial prep

> Document interne. Préparation entretien Ministre / Cabinet / DGI / Trésor.
> 30 questions probables, réponses prêtes à l'emploi.

---

## A. Questions techniques (Cabinet, DGA, conseillers IT)

### 1. « Êtes-vous le seul développeur ? Que se passe-t-il si vous tombez malade ? »
**Réponse** : « J'ai conçu seul cette plateforme. Le code source est documenté à 100 %, déposé en séquestre numérique chez un avocat. La convention prévoit une obligation de transfert de compétence à un tiers gabonais agréé en cas de défaillance. Je documente chaque module pour qu'un autre développeur puisse reprendre en moins de 4 semaines. »

### 2. « Est-ce que la plateforme tient la charge ? »
**Réponse** : « Aujourd'hui : 35 opérateurs, 78 ATIs, sans incident. Architecturalement, elle peut absorber 10 000 utilisateurs simultanés moyennant un dimensionnement serveur standard. Les requêtes sont mises en cache, la base PostgreSQL gère 50 000+ enregistrements sans difficulté. Test de charge à programmer avant la mise en production. »

### 3. « Et si un attaquant pénètre la plateforme ? »
**Réponse** : « La sécurité est intégrée dès la conception : authentification forte avec double facteur optionnel, sessions courtes 8 heures, journal d'audit complet, séparation stricte des rôles. J'ai effectué un audit RBAC sur 108 combinaisons de permissions sans aucune fuite détectée. Avant la mise en production publique, un pentest externe indépendant est obligatoire — je l'ai inscrit au protocole. »

### 4. « Qui héberge la plateforme ? »
**Réponse** : « Je recommande l'ANINF, garantissant la souveraineté gabonaise des données. À défaut, OVH Dakar ou Hetzner Africa, qui assurent le stockage en zone CEMAC. Le coût annuel d'hébergement est inclus dans le forfait. »

### 5. « Que faites-vous des données ? »
**Réponse** : « Les données sont la propriété pleine et entière de l'État Gabonais. Le protocole le stipule explicitement à l'article 5.4. Je n'ai aucun droit d'usage commercial. Les agrégations publiques (open data) sont anonymisées avec un seuil k-anonymity de 5. »

### 6. « Comment intégrez-vous avec les autres systèmes (DGI, Douanes, RCCM) ? »
**Réponse** : « La plateforme expose une API REST documentée et une API GraphQL. Les interconnexions techniques sont prêtes côté PNPI ; il reste à activer les conventions interministérielles. C'est un projet pour la deuxième année, à inscrire au plan d'action. »

### 7. « Et la signature électronique des décisions ministérielles ? »
**Réponse** : « Aujourd'hui la signature est apposée sous forme d'image. Pour une opposabilité juridique pleine, une signature électronique qualifiée est nécessaire. Je propose de l'intégrer dès l'année 1 via une autorité de certification reconnue, gabonaise ou CEMAC. »

### 8. « L'application mobile pour les inspecteurs est-elle prête ? »
**Réponse** : « La version web fonctionne déjà sur smartphone via le navigateur. Une app native Flutter est planifiée pour 6 semaines de développement, prioritaire pour les inspecteurs en zone rurale (Woleu-Ntem, Ogooué-Ivindo). Elle inclut le mode hors-ligne avec synchronisation. »

---

## B. Questions financières (DAF, Trésor)

### 9. « Combien ça coûte ? »
**Réponse** : « La plateforme elle-même vous est offerte. Pour la maintenance, l'évolution, l'hébergement et la formation, je propose un forfait annuel de 28 millions de francs CFA, modulable selon le périmètre retenu. C'est l'équivalent du salaire d'un seul ingénieur senior, pour un actif numérique national. »

### 10. « Pourquoi ce montant et pas moins ? »
**Réponse** : « Le coût équivalent d'un développement par marché public serait 80 à 120 millions one-shot, plus 15 % de maintenance annuelle. Mon offre représente 25 % du coût d'un marché classique sur 3 ans, avec un livrable déjà opérationnel. Ce n'est pas le prix qui est haut — c'est le coût alternatif qui est très, très élevé. »

### 11. « Est-ce qu'on peut négocier ? »
**Réponse** : « Bien entendu. J'ai construit trois options : Standard 18 M, Avancée 28 M, Premium 42 M. Chaque option correspond à un périmètre fonctionnel précis. Je peux préparer une proposition détaillée pour votre directeur des finances. »

### 12. « Comment justifier ce forfait au Trésor public ? »
**Réponse** : « Trois arguments : (1) la PNPI est un actif valorisé à 80–120 M FCFA cédé gracieusement, (2) le forfait représente l'amortissement industriel standard de 15–25 % par an, (3) les économies générées (déplacements, papier, temps de traitement) couvrent le forfait dès la deuxième année. »

### 13. « Y a-t-il un appel d'offres prévu ? »
**Réponse** : « Le protocole d'accord proposé n'est pas un marché public au sens strict : c'est une convention sui generis assortie d'une cession civique de droit d'usage. Cette voie est compatible avec le code des marchés publics gabonais sous réserve de validation par votre direction juridique. À défaut, je suis prêt à participer à un appel d'offres en présentant la PNPI comme un actif déjà constitué. »

### 14. « Quelle est votre marge ? »
**Réponse** : « Sur 28 M de revenus annuels, environ 14 M sont des charges directes (hébergement, services tiers, sécurité, structure légale, comptabilité). Il me reste 14 M pour vivre et faire évoluer la plateforme. Je ne suis pas dans une logique de profit maximal mais de soutenabilité personnelle et de réinvestissement. »

### 15. « Si on signait à 18 M ? »
**Réponse** : « C'est l'option Standard. Elle ne couvre pas le développement sur mesure, donc toute évolution serait facturée à part. Acceptable pour une première année de stabilisation. »

---

## C. Questions stratégiques (Ministre, Directeur de Cabinet)

### 16. « Pourquoi avez-vous fait ça ? »
**Réponse** : « Je suis informaticien gabonais formé à l'IAI. J'ai vu que le Ministère faisait fonctionner ses procédures sur papier alors que la technologie est disponible. J'ai voulu démontrer qu'un Gabonais peut produire un outil souverain de niveau étatique. C'est ma contribution citoyenne. »

### 17. « Qu'est-ce que vous attendez en retour ? »
**Réponse** : « Trois choses : (1) que la plateforme soit reconnue et utilisée, (2) que le partenariat me permette de vivre dignement et de la faire évoluer, (3) que le Gabon en tire un soft-power dans la sous-région CEMAC. Pas besoin d'autre chose. »

### 18. « Pourquoi pas un poste à l'ANINF ? »
**Réponse** : « C'est une option flatteuse, mais elle limiterait la portée. En tant que partenaire externe, je peux étendre la plateforme à d'autres pays CEMAC sous l'égide du Gabon, ce qui ne serait pas possible en tant qu'agent public. La structure que je propose — partenariat avec PI préservée — sert mieux les intérêts à long terme de l'État. »

### 19. « Vous voulez vendre ça à d'autres pays ? »
**Réponse** : « Pas vendre — déployer en partenariat. Si le modèle gabonais fait ses preuves, le Cameroun, le Congo ou le Tchad pourraient adopter une version adaptée. Le Gabon serait reconnu comme l'État pionnier. C'est un soft-power numérique gratuit pour notre diplomatie. »

### 20. « Comment garantir la pérennité après vous ? »
**Réponse** : « Trois mécanismes : (1) code source en séquestre, (2) documentation exhaustive, (3) clause de transfert de compétence à un tiers gabonais agréé. Au-delà, la croissance de la plateforme financera l'embauche d'un ou deux développeurs gabonais à partir de l'année 3. »

### 21. « Et si on vous propose 100 M FCFA en achat unique ? »
**Réponse** : « Je suis ouvert à toute discussion. Une acquisition pure m'imposerait toutefois de renoncer à la PI et donc au déploiement CEMAC qui est, à mon sens, l'opportunité stratégique pour le Gabon. Si vous insistez sur ce modèle, je vous demanderais alors un contrat de consultant exclusif pendant 3 ans pour assurer la maintenance et la formation. »

### 22. « Pourquoi vous croire ? Vous êtes seul. »
**Réponse** : « Vous pouvez tester la plateforme aujourd'hui, en direct. Tous les comptes utilisateurs sont configurés. Le code source est sur GitHub, ouvert à votre audit. J'ai préparé 6 guides PDF complets par profil. Les preuves sont là, opérationnelles. »

### 23. « Avez-vous d'autres clients ? »
**Réponse** : « Pas pour cette plateforme. Je tiens à ce que le Gabon soit le premier client, le premier partenaire, et donc le premier à en récolter les bénéfices stratégiques. »

---

## D. Questions politiques / institutionnelles

### 24. « Cela ne va-t-il pas susciter de la résistance interne ? »
**Réponse** : « Le changement est toujours sensible. C'est pourquoi j'ai prévu une formation initiale de 3 jours par groupe métier, une hotline directe pour le Cabinet, et une période d'accompagnement renforcé sur 90 jours. La plateforme garde aussi tous les statuts intermédiaires que les agents connaissent — pas de bouleversement. »

### 25. « L'ANINF est-elle au courant ? »
**Réponse** : « Pas formellement. Je propose qu'elle soit l'opérateur d'hébergement, ce qui valorise son rôle. Dès la signature, je rencontre la Direction de l'ANINF pour cadrer techniquement. »

### 26. « Quelle est la position de la Présidence ? »
**Réponse** : « Je n'ai pas eu de contact direct. Mais une plateforme qui démontre la souveraineté numérique du Gabon dans un secteur stratégique (l'industrie) s'inscrit naturellement dans les orientations de transformation digitale. »

### 27. « Y a-t-il des risques juridiques ? »
**Réponse** : « Le protocole est rédigé selon le droit gabonais. Les clauses de protection des données sont conformes à la loi N°026/2017. Les conditions de cession de droit d'usage sont juridiquement classiques. Une relecture par votre direction juridique est bien sûr indispensable. »

### 28. « Vous parlez d'open data — c'est dangereux non ? »
**Réponse** : « Au contraire, c'est un argument de transparence ministérielle. Les données exposées sont **agrégées et anonymisées** : aucun NIF individuel, aucune raison sociale nominative, aucun effectif précis. Seuls les volumes par secteur, par province, par année sont publiés. C'est la transparence qu'attendent les citoyens et les partenaires internationaux. »

### 29. « Et si les opérateurs s'opposent ? »
**Réponse** : « Au contraire — la plateforme leur facilite la vie : guichet 24/7, suivi en temps réel, certificat PDF téléchargeable, vérification publique par QR code. Les opérateurs déjà testeurs me confirment qu'ils gagnent un temps considérable. »

### 30. « Quelle est la prochaine étape ? »
**Réponse** : « Avec votre accord, je propose : (1) une réunion technique avec votre DGA et l'ANINF dans les 7 jours, (2) une démonstration approfondie au Cabinet dans 14 jours, (3) la formalisation du protocole sous 30 jours. La plateforme peut être opérationnelle officiellement dans les 60 jours. »

---

## E. Pièges à éviter

### Si on vous met sous pression pour baisser le prix immédiatement
> « Monsieur, je préfère revenir vers vous avec une proposition affinée selon vos contraintes budgétaires. Pouvez-vous m'indiquer l'enveloppe annuelle dont dispose le Ministère pour la modernisation numérique ? Je calibrerai en conséquence sans dégrader le service. »

### Si on vous propose un statut d'agent public sans cadre clair
> « C'est une marque d'estime, je l'apprécie. Permettez-moi de revenir vers votre Cabinet avec une note comparant les deux options — partenariat externe vs intégration — afin que vous puissiez décider en toute connaissance de cause. »

### Si on vous demande de céder la PI gratuitement
> « Le Gabon bénéficie d'un droit d'usage perpétuel et exclusif sur son territoire. La PI me permet de continuer à investir dans la plateforme et de la faire rayonner pour le Gabon dans la sous-région. Sans elle, ce que je peux livrer s'arrête à la frontière. »

### Si on vous interrompt pour appeler quelqu'un
> Restez calme, ne vous précipitez pas. Profitez du temps pour observer le décor et collecter les signaux. Reprenez où vous en étiez avec un sourire.

### Si on vous offre un café et qu'on parle d'autre chose
> C'est probablement bon signe (test de personnalité). Soyez à l'aise, parlez du Gabon, des familles, du sport. Revenez naturellement à la PNPI quand on vous y invite.

---

## F. Posture corporelle et verbale (rappels)

- **Poignée de main** ferme, sans serrer
- **Contact visuel** soutenu mais non agressif (regarder entre les yeux ou le front)
- **Tenue** : sobre, costume sombre, cravate unie
- **Téléphone** : éteint, hors de vue
- **Documents** : un seul dossier remis en main propre, en double exemplaire
- **Voix** : calme, posée, légèrement plus lente que d'ordinaire
- **Silences** : ne pas les combler — laisser le Cabinet réagir
- **Compliments** : remercier sobrement, ne jamais en redemander
- **Critiques** : noter sans débattre, dire « je note, je vais y réfléchir »
- **À la fin** : remercier pour le temps accordé, demander quelle est la prochaine étape

---

*Document interne. Ne pas distribuer. À relire 30 minutes avant l'audience.*
*Version 1.0 · Avril 2026*
