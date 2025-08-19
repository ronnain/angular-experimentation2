## Query

Gestion de la method pour trigger une query & ajout à la signature

## ById

gérer le trigger de plusieurs d'un coup

## Doc

Ajout des tests manquants en même temps

## Feature

- gérer les withMutationById depuis withQuery
- associatedState, prévoir un cas où ça vient du store ?
- pour les withQuery/MutationById créer un proxy
- gérer les streams via les resourcesById?
- withMutationById
- withServerState
- toGlobalServerState
- localServer state: https://stackblitz.com/edit/stackblitz-starters-31qrd2nq?file=withFeature%2F1-simple-only-one-helper-to-use.ts
- genericLocalServerState (use created https://stackblitz.com/edit/stackblitz-starters-31qrd2nq?file=withFeature%2Fhandle-feature-with-generic.ts)
  -faire les with... avec les events/sources de ngrx

### ServerStateStore

- Accepter d'avoir directement un signalStore, mais ne pas exposer with...
- Pas forcément global, rajouter une option ? (Utile seulement si c'est une feature de passée)

## NestedEffect

- Add some tests

## Idea

- Ajouter le on event dans les rxQuery/rxMutation
- Ajouter la gestion du status reloading pour trigger le relaod d'une query ?
- rename associatedState by patchState
- Ajout d'une liste des actions local (des optimistic patch/update), pour pouvoir revert plus facilement pour en appliquer une nouvelle ? Cette list se reset à chaque fetch success
- faire en sorte d'accepter la syntax WithQuery("name", query())
