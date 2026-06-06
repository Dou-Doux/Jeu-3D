# Infiltration — Jeu 3D (Three.js)

Jeu d'action/arcade en vue à la troisième personne. Vous infiltrez une maison,
récupérez l'objet de mission, déclenchez l'alarme, puis fuyez en voiture pendant
que gendarmes et militaires vous prennent en chasse.

## Jouer en ligne

Ouvrez directement l'URL GitHub Pages du dépôt dans Chrome — aucune installation requise.

## Lancer en local

Le jeu utilise des modules ES6 et un `importmap`, il doit être servi par un
serveur HTTP (pas en `file://`).

```bash
cd /chemin/vers/Jeu-3D
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Commandes

| Touche | Action |
|--------|--------|
| ZQSD / WASD / flèches | Déplacement |
| Souris | Caméra |
| Shift | Sprint (à pied) |
| E | Interagir (ramasser l'objet / monter en voiture) |
| Espace | Frein à main / drift (en voiture) |

## Déroulé

1. Entrez dans la maison et approchez-vous du cube lumineux turquoise.
2. Appuyez sur **E** pour récupérer l'objet → alarme (flash rouge), barrages, gendarmes.
3. Rejoignez votre voiture rouge garée dehors, appuyez sur **E** pour monter.
4. Fuyez ! Après 30 s d'alarme, des renforts militaires (jeeps vertes) arrivent.
5. **Victoire** : maintenez plus de 150 m d'écart pendant 60 s cumulées.
6. **Défaite** : un poursuivant reste à moins de 10 m pendant 5 s.

## Architecture

| Fichier | Rôle |
|---------|------|
| `index.html` | Canvas, overlay HUD, importmap Three.js r0.158 |
| `src/main.js` | Scène, caméra, renderer, boucle RAF |
| `src/game.js` | États, alarme, conditions victoire/défaite, spawn IA |
| `src/world.js` | Environnement procédural : sol, routes, maison, arbres, barrages |
| `src/player.js` | Personnage, WASD, pointer lock, caméra 3e personne |
| `src/vehicle.js` | Voiture arcade, sirènes, FOV vitesse |
| `src/ai.js` | IA de poursuite (steering vers le joueur) |
| `src/ui.js` | Overlay HTML : menus, HUD, vitesse, barre recherche |

Assets 100% procéduraux — aucun fichier externe.
