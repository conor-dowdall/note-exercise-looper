# Note Exercise Looper

A web component for practicing musical exercises. It provides a user interface
to control various parameters of the exercise, such as tempo, key, scale, and
more.

## Installation

This project uses [Deno](https://deno.land/) and [JSR](https://jsr.io/).

To use this component in your project, you can import it from JSR:

```typescript
import "jsr:@musodojo/note-exercise-looper";
```

## Usage

Once imported, you can use the `<note-exercise-looper>` custom element in your
HTML:

```html
<note-exercise-looper></note-exercise-looper>
```

## Features

- **Customizable Exercises:** Control the root note, scale, tempo, and other
  parameters.
- **Looping and Playback Control:** Loop exercises, play them with an intro, and
  pause/resume playback.
- **Web Component:** A self-contained, reusable component that can be easily
  integrated into any web page.

## API

### `<note-exercise-looper>`

A custom element that provides a user interface for practicing musical
exercises.

#### Events

- **`web-note-player-on`**: Dispatched to play a note. This custom event is
  handled by the `@musodojo/web-note-player` package to produce audio. The event
  detail contains `midiNoteNumber`, `instrumentAudio`, `noteDuration`, and
  `noteDelay`.

## Development

### Prerequisites

- [Deno](https://deno.land/)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/musodojo/note-exercise-looper.git
   ```
2. Navigate to the project directory:
   ```bash
   cd note-exercise-looper
   ```
3. Run the example:
   ```bash
   deno run -A bundle.ts
   ```
   Then open `examples/example1.html` in your browser.

### Linting

Use `deno doc --lint` to identify and fix issues in the documentation.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the UNLICENSE. See the [UNLICENSE](UNLICENSE)
file for details.
