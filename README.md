# lavori-aperti

Mod per Claude Code che tiene sott'occhio i lavori aperti della sessione.

- **Status line**: `Lavori aperti: 2 task · 3 file modificati · 1 commit da pushare · 1 stash`, aggiornata a fine di ogni turno.
- **Comando `/lavori`**: apre il pannello "Lavori aperti" con
  - task della sessione non completati (da `TaskCreate`/`TaskUpdate`/`TodoWrite`), ◐ in corso, ○ da fare;
  - branch e upstream, commit da pushare / da scaricare, stash;
  - file modificati o non tracciati (`git status`);
  - pulsante **Aggiorna** (tasto `r`).

## Installazione

```
/plugin install lavori-aperti --marketplace ernestoderasis-ai/ed
```

Rispondi `y` per aggiungere il marketplace, poi scegli lo scope.

## Sviluppo

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```
