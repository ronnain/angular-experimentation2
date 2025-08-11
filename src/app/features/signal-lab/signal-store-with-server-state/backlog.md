## Query

Gestion de la method pour trigger une query & ajout à la signature

## ById

gérer le trigger de plusieurs d'un coup

## Doc

Ajout des tests manquants en même temps

## Feature

- associatedState, prévoir un cas où ça vient du store ?
- withMutationById
- withServerState
- toGlobalServerState
- localServer state: https://stackblitz.com/edit/stackblitz-starters-31qrd2nq?file=withFeature%2F1-simple-only-one-helper-to-use.ts
- genericLocalServerState (use created https://stackblitz.com/edit/stackblitz-starters-31qrd2nq?file=withFeature%2Fhandle-feature-with-generic.ts)

## NestedEffect

- Add some tests

## Idea

- Ajouter le on event dans les rxQuery/rxMutation
- Ajouter la gestion du status reloading pour trigger le relaod d'une query ?
- rename associatedState by patchState
- Ajout d'une liste des actions local (des optimistic patch/update), pour pouvoir revert plus facilement pour en appliquer une nouvelle ? Cette list se reset à chaque fetch success
- faire en sorte d'accepter la syntax WithQuery("name", query())
