# Wyble Practice Template Library

Structured progressions for generating counterpoint etudes over common jazz progressions and compositions.

## Format

Templates use the internal progression format:

```json
[
  { "chord": "Dm7", "bars": 2 },
  { "chord": "G7", "bars": 2 },
  { "chord": "Cmaj7", "bars": 4 }
]
```

## Adding Custom Templates

Edit `templateLibrary.ts` and add a new entry to `TEMPLATE_LIBRARY`:

```ts
my_template: {
  id: 'my_template',
  name: 'My Progression',
  description: 'Optional description',
  progression: [
    { chord: 'Am7', bars: 2 },
    { chord: 'D7', bars: 2 },
    { chord: 'Gmaj7', bars: 4 },
  ],
},
```

Add the template id to `TEMPLATE_ORDER` to include it in the desktop UI selector.
