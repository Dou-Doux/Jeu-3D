# Infiltration — Jeu 3D (Three.js)

Jeu d'action/arcade en vue à la troisième personne. Vous infiltrez une maison,
récupérez l'objet de mission, déclenchez l'alarme, puis fuyez en voiture pendant
que gendarmes et militaires vous prennent en chasse.

## Lancer le jeu

Le jeu utilise des modules ES6 et un `importmap`, il doit donc être servi par un
serveur HTTP (pas en `file://`).

```bash
cd /home/user/Jeu-3D
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 dans Chrome / un navigateur récent
```

Cliquez sur **Jouer**, puis cliquez dans la fenêtre pour activer le contrôle
caméra (pointer lock).

## Commandes

| Touche | Action |
|--------|--------|
| ZQSD / WASD / flèches | Déplacement |
| Souris | Caméra |
| Shift | Sprint (à pied) |
| E | Interagir (ramasser l'objet / monter en voiture) |
| Espace | Frein à main / drift (en voiture) |

## Déroulé

1. Entrez dans la maison et approchez-vous du cube lumineux.
2. Appuyez sur **E** pour récupérer l'objet → l'alarme se déclenche (flash rouge),
   des barrages apparaissent et les gendarmes lancent la poursuite.
3. Rejoignez votre voiture rouge garée dehors, appuyez sur **E** pour monter.
4. Fuyez ! Après 30 s d'alarme, des renforts militaires (jeeps) arrivent.
5. **Victoire** : maintenez plus de 150 m d'écart pendant 60 s cumulées.
6. **Défaite** : un poursuivant reste à moins de 10 m pendant 5 s.

## Architecture

| Fichier | Rôle |
|---------|------|
| `index.html` | Canvas, overlay HUD HTML/CSS, importmap Three.js (unpkg r0.158). |
| `src/main.js` | Scène, caméra, renderer, boucle `requestAnimationFrame`, resize. |
| `src/game.js` | Machine à états (MENU / ON_FOOT / IN_VEHICLE / VICTORY / DEFEAT), transitions, alarme, conditions de victoire/défaite, spawn des poursuivants. |
| `src/world.js` | Environnement procédural : sol, routes, maison avec intérieur, arbres, lampadaires, objet de mission, barrages, collisions AABB. |
| `src/player.js` | Personnage stylisé, déplacement WASD relatif caméra, pointer lock, sprint, collisions, caméra 3e personne. |
| `src/vehicle.js` | Voiture stylisée (joueur, gendarme, militaire), physique arcade, gyrophares, rotation des roues, FOV vitesse. |
| `src/ai.js` | `AIVehicle` : pilotage automatique vers le joueur (steering par angle). |
| `src/ui.js` | Contrôleur de l'overlay HTML : menu, objectifs, compteur, barre de recherche, écrans fin. |

Tous les assets sont procéduraux (géométries Three.js uniquement), aucun fichier
externe. Matériaux Lambert/Phong et pixel ratio plafonné pour viser 60 fps sur
Chromebook.
