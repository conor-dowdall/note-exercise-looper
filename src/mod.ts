/**
 * @module note-exercise-looper
 * This module defines the `<note-exercise-looper>` custom element, a web component
 * for practicing musical exercises. It provides a user interface to control
 * various parameters of the exercise, such as tempo, key, scale, and more.
 *
 * @example
 * ```html
 * <note-exercise-looper audio-sprite-url="/path/to/your/sprite.ogg"></note-exercise-looper>
 * ```
 */
import "@musodojo/enharmonic-note-selector";
import "@musodojo/note-sequence-selector";
import { initWebNotePlayer } from "@musodojo/web-note-player";
import { nylonGuitarAudioSpriteData } from "../assets/nylon-guitar-audio-sprite-data.js";
import type {
  EnharmonicNoteSelectedEventDetail,
  EnharmonicNoteSelector,
} from "@musodojo/enharmonic-note-selector";
import type {
  NoteSequenceSelectedEventDetail,
  NoteSequenceSelector,
} from "@musodojo/note-sequence-selector";
import type {
  NoteInteger,
  NoteSequenceThemeKey,
} from "@musodojo/music-theory-data/types";

/**
 * Defines the possible playing patterns for the note exercise.
 */
export type PlayingPattern = "quarter" | "eighth" | "triplet" | "sixteenth";

const LOCAL_STORAGE_KEY = "note-exercise-looper-state";

const DEFAULT_INTRO_BEATS: number = 4;

const DEFAULT_ROOT_PITCH_INTEGER: NoteInteger = 0;
const DEFAULT_ROOT_NOTE_NAME: string = "C";

const DEFAULT_NOTE_SEQUENCE: NoteInteger[] = [0, 2, 4, 5, 7, 9, 11];
const DEFAULT_NOTE_SEQUENCE_THEME_KEY: NoteSequenceThemeKey = "ionian";

const DEFAULT_TEMPO: number = 80;
const DEFAULT_ROOT_NOTE_OCTAVE: number = 4; // Middle C is MIDI note 60, which is C4 - use [(rootNoteOctave + 1) * 12] for correct conversion
const DEFAULT_NOTE_DURATION: number = 1;

const DEFAULT_PLAYING_PATTERN: PlayingPattern = "quarter";

const DEFAULT_NUM_OCTAVES: number = 1;
const DEFAULT_EXTRA_NOTES: number = 0;
const DEFAULT_EXTRA_RESTS: number = 0;

const noteExerciseLooperTemplate = document.createElement("template");
noteExerciseLooperTemplate.innerHTML = /* HTML */ `
  <style>
    :host {
      --_padding-block: 0.5em;
      --_padding-inline: 1.5em;
      --_padding: var(--_padding-block) var(--_padding-inline);
      --_background-color-active: color-mix(
        in srgb,
        currentColor 25%,
        transparent
      );
      --_border: 0.1em solid currentColor;
      --_border-radius: 0.5em;
      --_gap-sm: 0.3em;
      --_gap-lg: 1em;
      --_gap-xl: 1.3em;

      /* padding is set on these specific custom elements using custom properties */
      --enharmonic-note-selector-padding: var(--_padding);
      --note-sequence-selector-padding: var(--_padding);

      display: inline-block;
    }

    button,
    enharmonic-note-selector,
    note-sequence-selector,
    #pattern-control > label,
    #intro-beats-selector > label {
      border: var(--_border);
      border-radius: var(--_border-radius);
      cursor: pointer;
    }

    button {
      font: inherit;
      margin: 0;
      padding: var(--_padding);
      background: none;
    }

    button.active {
      background-color: var(--_background-color-active);
    }

    input[type="range"] {
      width: 100%;
    }

    #control-groups {
      display: flex;
      flex-direction: column;
      gap: var(--_gap-xl);
    }

    #playback-control,
    #pitch-control {
      display: flex;
      flex-wrap: wrap;
      gap: var(--_gap-lg);

      > * {
        flex: 1;
        min-width: fit-content;
      }
    }

    #intro-control {
      display: flex;
      gap: var(--_gap-sm);

      > #intro-button {
        flex: 1;
      }

      > #intro-beats-selector {
        display: flex;
        flex-direction: column;
        gap: var(--_gap-sm);

        > label {
          padding: var(--_padding);
          text-align: center;

          &:has(input:checked) {
            background-color: var(--_background-color-active);
          }

          > input {
            display: none;
          }
        }
      }
    }

    #pattern-control {
      display: flex;
      flex-wrap: wrap;
      gap: var(--_gap-sm);

      & > label {
        flex: 1;
        min-width: max-content;
        padding: var(--_padding);

        &:has(input:checked) {
          background-color: var(--_background-color-active);
        }

        > input {
          display: none;
        }
      }
    }
  </style>
  <div id="control-groups">
    <div id="playback-control">
      <button id="loop-button">Loop</button>
      <div id="intro-control">
        <button id="intro-button">Intro</button>
        <div
          id="intro-beats-selector"
          role="radiogroup"
          aria-label="Intro beats"
        >
          <label><input type="radio" name="intro-beats" value="2" />2</label>
          <label><input type="radio" name="intro-beats" value="3" />3</label>
          <label><input type="radio" name="intro-beats" value="4" />4</label>
        </div>
      </div>
      <button id="pause-button">Pause</button>
    </div>

    <div id="pitch-control">
      <enharmonic-note-selector></enharmonic-note-selector>
      <note-sequence-selector></note-sequence-selector>
    </div>

    <div id="tempo-control">
      <label>
        <span id="tempo-text">${DEFAULT_TEMPO}</span>bpm
        <br />
        <input
          id="tempo-input"
          type="range"
          min="40"
          max="240"
          value="${DEFAULT_TEMPO}"
        />
      </label>
    </div>

    <div id="root-note-octave-control">
      <label>
        Octave
        <span id="root-note-octave-text">${DEFAULT_ROOT_NOTE_OCTAVE}</span>
        <br />
        <input
          id="root-note-octave-input"
          type="range"
          min="-1"
          max="9"
          step="1"
          value="${DEFAULT_ROOT_NOTE_OCTAVE}"
        />
      </label>
    </div>

    <div id="note-duration-control">
      <label>
        <span id="note-duration-text">${DEFAULT_NOTE_DURATION}</span>s Duration
        <br />
        <input
          id="note-duration-input"
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value="${DEFAULT_NOTE_DURATION}"
        />
      </label>
    </div>

    <div id="pattern-control" role="radiogroup" aria-label="Playing pattern">
      <label>
        <input type="radio" name="pattern" value="quarter" />
        Quarter / Crotchet
      </label>
      <label>
        <input type="radio" name="pattern" value="eighth" />
        Eighth / Quaver
      </label>
      <label>
        <input type="radio" name="pattern" value="triplet" />
        Triplet
      </label>
      <label>
        <input type="radio" name="pattern" value="sixteenth" />
        Sixteenth / Semiquaver
      </label>
    </div>

    <div id="num-octaves-control">
      <label
        ><span id="num-octaves-text">${DEFAULT_NUM_OCTAVES}</span>
        Octave(s)<br />
        <input
          type="range"
          id="num-octaves-input"
          min="0"
          max="5"
          value="${DEFAULT_NUM_OCTAVES}"
        />
      </label>
    </div>

    <div>
      <label
        ><span id="extra-notes-text">${DEFAULT_EXTRA_NOTES}</span> Extra
        Note(s)<br />
        <input
          type="range"
          id="extra-notes-input"
          min="0"
          max="11"
          value="${DEFAULT_EXTRA_NOTES}"
      /></label>
    </div>

    <div>
      <label
        ><span id="extra-rests-text">${DEFAULT_EXTRA_RESTS}</span> Rest(s) at
        End<br />
        <input
          type="range"
          id="extra-rests-input"
          min="0"
          max="12"
          value="${DEFAULT_EXTRA_RESTS}"
      /></label>
    </div>
  </div>
`;

/**
 * A custom element that provides a user interface for practicing musical exercises.
 * It allows users to select a root note, a musical scale (sequence), and then
 * generates and plays a note exercise based on these parameters. The component
 * offers controls for tempo, note duration, octave, and other variations.
 *
 * @fires web-note-player-on - Dispatches an event to play a note. This custom event
 * is handled by the `@musodojo/web-note-player` package to produce audio.
 * The event detail contains `midiNoteNumber`, `instrumentAudio`, `noteDuration`, and `noteDelay`.
 *
 * @example
 * ```html
 * <note-exercise-looper audio-sprite-url="/path/to/your/sprite.ogg"></note-exercise-looper>
 * ```
 */
class NoteExerciseLooper extends HTMLElement {
  #introBeats: number = DEFAULT_INTRO_BEATS;

  #rootNoteInteger: NoteInteger = DEFAULT_ROOT_PITCH_INTEGER;
  #rootNoteName: string = DEFAULT_ROOT_NOTE_NAME;

  #currentSequence: number[] = DEFAULT_NOTE_SEQUENCE;
  #currentSequenceThemeKey: NoteSequenceThemeKey =
    DEFAULT_NOTE_SEQUENCE_THEME_KEY;

  #tempo: number = DEFAULT_TEMPO;
  #playingPatternDurations: Record<PlayingPattern, number> = {
    quarter: 0,
    eighth: 0,
    triplet: 0,
    sixteenth: 0,
  };
  #rootNoteOctave: number = DEFAULT_ROOT_NOTE_OCTAVE;
  #noteDuration: number = DEFAULT_NOTE_DURATION;

  #playingPattern: PlayingPattern = DEFAULT_PLAYING_PATTERN;

  #numOctaves: number = DEFAULT_NUM_OCTAVES;
  #extraNotes: number = DEFAULT_EXTRA_NOTES;
  #extraRests: number = DEFAULT_EXTRA_RESTS;

  #exerciseNotes: (number | null)[] = [];
  #currentNoteIndex: number = 0;
  #nextNoteTime: number = 0;
  #animationFrameId: number | null = null;
  #isLooping: boolean = false;
  #isPaused: boolean = false;
  #isIntroActive: boolean = false;

  #shadowRoot: ShadowRoot;
  #abortController: AbortController = new AbortController();

  #loopButton: HTMLButtonElement | null = null;
  #introButton: HTMLButtonElement | null = null;
  #pauseButton: HTMLButtonElement | null = null;

  #enharmonicNoteSelector: EnharmonicNoteSelector | null = null;
  #noteSequenceSelector: NoteSequenceSelector | null = null;

  #tempoText: HTMLSpanElement | null = null;
  #tempoInput: HTMLInputElement | null = null;

  #rootNoteOctaveText: HTMLSpanElement | null = null;
  #rootNoteOctaveInput: HTMLInputElement | null = null;

  #noteDurationText: HTMLSpanElement | null = null;
  #noteDurationInput: HTMLInputElement | null = null;

  #numOctavesText: HTMLSpanElement | null = null;
  #numOctavesInput: HTMLInputElement | null = null;

  #extraNotesText: HTMLSpanElement | null = null;
  #extraNotesInput: HTMLInputElement | null = null;

  #extraRestsText: HTMLSpanElement | null = null;
  #extraRestsInput: HTMLInputElement | null = null;

  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "open" });
    this.#shadowRoot!.appendChild(
      noteExerciseLooperTemplate.content.cloneNode(true),
    );
  }

  /**
   * Lifecycle callback that runs when the element is added to the DOM.
   * @private
   */
  connectedCallback() {
    const audioSpriteUrl = this.getAttribute("audio-sprite-url");
    if (audioSpriteUrl) {
      initWebNotePlayer(audioSpriteUrl, nylonGuitarAudioSpriteData);
    } else {
      console.warn(
        "note-exercise-looper: 'audio-sprite-url' attribute is missing. Audio playback will not work.",
      );
    }

    this.#cacheDOMElements();
    this.#addEventListeners();
    this.#loadState();
    this.#generateExercise(); // Generate initial exercise

    // handled in #loadState()...
    // this.#extraNotesInput!.max = this.#currentSequence.length.toString();
    // // Set initial active state for intro beats button
    // const initialIntroBeatsButton = this.#shadowRoot.querySelector(
    //   `#intro-beats-selector input[value="${this.#introBeats}"]`
    // ) as HTMLInputElement;
    // if (initialIntroBeatsButton) {
    //   initialIntroBeatsButton.checked = true;
    // }
  }

  /**
   * Lifecycle callback that runs when the element is removed from the DOM.
   * @private
   */
  disconnectedCallback() {
    this.#abortController.abort();
  }

  /**
   * @private
   */
  #cacheDOMElements() {
    this.#loopButton = this.#shadowRoot.getElementById(
      "loop-button",
    ) as HTMLButtonElement;
    this.#introButton = this.#shadowRoot.getElementById(
      "intro-button",
    ) as HTMLButtonElement;
    this.#pauseButton = this.#shadowRoot.getElementById(
      "pause-button",
    ) as HTMLButtonElement;

    this.#enharmonicNoteSelector = this.#shadowRoot.querySelector(
      "enharmonic-note-selector",
    ) as EnharmonicNoteSelector;
    this.#noteSequenceSelector = this.#shadowRoot.querySelector(
      "note-sequence-selector",
    ) as NoteSequenceSelector;

    this.#tempoText = this.#shadowRoot.getElementById(
      "tempo-text",
    ) as HTMLSpanElement;
    this.#tempoInput = this.#shadowRoot.getElementById(
      "tempo-input",
    ) as HTMLInputElement;
    this.#rootNoteOctaveText = this.#shadowRoot.getElementById(
      "root-note-octave-text",
    ) as HTMLSpanElement;
    this.#rootNoteOctaveInput = this.#shadowRoot.getElementById(
      "root-note-octave-input",
    ) as HTMLInputElement;
    this.#noteDurationText = this.#shadowRoot.getElementById(
      "note-duration-text",
    ) as HTMLSpanElement;
    this.#noteDurationInput = this.#shadowRoot.getElementById(
      "note-duration-input",
    ) as HTMLInputElement;

    this.#numOctavesText = this.#shadowRoot.getElementById(
      "num-octaves-text",
    ) as HTMLSpanElement;
    this.#numOctavesInput = this.#shadowRoot.getElementById(
      "num-octaves-input",
    ) as HTMLInputElement;
    this.#extraNotesText = this.#shadowRoot.getElementById(
      "extra-notes-text",
    ) as HTMLSpanElement;
    this.#extraNotesInput = this.#shadowRoot.getElementById(
      "extra-notes-input",
    ) as HTMLInputElement;
    this.#extraRestsText = this.#shadowRoot.getElementById(
      "extra-rests-text",
    ) as HTMLSpanElement;
    this.#extraRestsInput = this.#shadowRoot.getElementById(
      "extra-rests-input",
    ) as HTMLInputElement;
  }

  #addEventListeners() {
    const signal = this.#abortController.signal;

    // Playback controls
    this.#loopButton!.addEventListener("click", () => this.#toggleLoop(), {
      signal,
    });
    this.#introButton!.addEventListener("click", () => this.#playWithIntro(), {
      signal,
    });
    this.#shadowRoot
      .querySelectorAll('input[name="intro-beats"]')
      .forEach((radio) => {
        radio.addEventListener(
          "change",
          (e: Event) => {
            this.#introBeats = parseInt(
              (e.target as HTMLInputElement).value,
              10,
            );
            this.#debouncedSaveState();
          },
          { signal },
        );
      });
    this.#pauseButton!.addEventListener("click", () => this.#togglePause(), {
      signal,
    });

    // pitch-related controls
    this.#enharmonicNoteSelector!.addEventListener(
      "enharmonic-note-selected",
      ((e: CustomEvent<EnharmonicNoteSelectedEventDetail>) => {
        this.#rootNoteInteger = e.detail.noteInteger;
        this.#rootNoteName = e.detail.noteName;

        this.#generateExercise();
        this.#debouncedSaveState();
      }) as EventListenerOrEventListenerObject,
      { signal },
    );

    this.#noteSequenceSelector!.addEventListener(
      "note-sequence-selected",
      ((e: CustomEvent<NoteSequenceSelectedEventDetail>) => {
        this.#currentSequence = e.detail.noteSequenceTheme.integers;
        this.#currentSequenceThemeKey = e.detail.noteSequenceThemeKey;

        this.#extraNotesInput!.max = this.#currentSequence.length.toString();

        // check if current value is larger than the new max value
        if (
          parseInt(this.#extraNotesInput!.value, 10) >
            this.#currentSequence.length
        ) {
          this.#extraNotesInput!.value = this.#currentSequence.length
            .toString();
          this.#extraNotes = this.#currentSequence.length;
        }

        this.#generateExercise();
        this.#debouncedSaveState();
      }) as EventListenerOrEventListenerObject,
      { signal },
    );

    // Tempo control
    this.#tempoInput!.addEventListener(
      "input",
      () => {
        this.#tempo = parseInt(this.#tempoInput!.value, 10);
        this.#tempoText!.textContent = this.#tempo.toString();
        this.#setPlayingPatternDurations();
        this.#debouncedSaveState();
      },
      { signal },
    );

    // Note Duration control
    this.#noteDurationInput!.addEventListener(
      "input",
      () => {
        this.#noteDuration = parseFloat(this.#noteDurationInput!.value);
        this.#noteDurationText!.textContent = this.#noteDuration.toString();
        this.#debouncedSaveState();
      },
      { signal },
    );

    // Root-Note Octave control
    this.#rootNoteOctaveInput!.addEventListener(
      "input",
      () => {
        this.#rootNoteOctave = parseFloat(this.#rootNoteOctaveInput!.value);
        this.#rootNoteOctaveText!.textContent = this.#rootNoteOctave.toString();
        this.#generateExercise();
        this.#debouncedSaveState();
      },
      { signal },
    );

    // Playing Pattern radio buttons
    this.#shadowRoot
      .querySelectorAll('input[name="pattern"]')
      .forEach((radio) => {
        radio.addEventListener(
          "change",
          (e: Event) => {
            this.#playingPattern = (e.target as HTMLInputElement)
              .value as PlayingPattern;
            this.#debouncedSaveState();
          },
          { signal },
        );
      });

    // Octaves control
    this.#numOctavesInput!.addEventListener(
      "input",
      () => {
        this.#numOctaves = parseInt(this.#numOctavesInput!.value, 10);
        this.#numOctavesText!.textContent = this.#numOctaves.toString();
        this.#generateExercise();
        this.#debouncedSaveState();
      },
      { signal },
    );

    // Extra Notes control
    this.#extraNotesInput!.addEventListener(
      "input",
      () => {
        this.#extraNotes = parseInt(this.#extraNotesInput!.value, 10);
        this.#extraNotesText!.textContent = this.#extraNotes.toString();
        this.#generateExercise();
        this.#debouncedSaveState();
      },
      { signal },
    );

    // Extra Rests control
    this.#extraRestsInput!.addEventListener(
      "input",
      () => {
        this.#extraRests = parseInt(this.#extraRestsInput!.value, 10);
        this.#extraRestsText!.textContent = this.#extraRests.toString();
        this.#generateExercise();
        this.#debouncedSaveState();
      },
      { signal },
    );
  }

  #debouncedSaveState = debounce(() => this.#saveState(), 300);

  /**
   * @private
   * Saves the current state of the component to localStorage.
   */
  #saveState() {
    console.log("save state");
    const state = {
      introBeats: this.#introBeats,

      rootNoteInteger: this.#rootNoteInteger,
      rootNoteName: this.#rootNoteName,
      currentSequence: this.#currentSequence,
      currentSequenceThemeKey: this.#currentSequenceThemeKey,

      tempo: this.#tempo,
      rootNoteOctave: this.#rootNoteOctave,
      noteDuration: this.#noteDuration,

      playingPattern: this.#playingPattern,

      numOctaves: this.#numOctaves,
      extraNotes: this.#extraNotes,
      extraRests: this.#extraRests,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }

  #setPlayingPatternDurations() {
    const beatDurationMs = (60 / this.#tempo) * 1000; // Duration of a quarter note (1 beat) in ms
    this.#playingPatternDurations.quarter = beatDurationMs;
    this.#playingPatternDurations.eighth = beatDurationMs / 2;
    this.#playingPatternDurations.triplet = beatDurationMs / 3;
    this.#playingPatternDurations.sixteenth = beatDurationMs / 4;
  }

  /**
   * @private
   * Loads the component's state from localStorage.
   */
  #loadState() {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    const state = savedState === null ? {} : JSON.parse(savedState);

    this.#introBeats = state.introBeats ?? DEFAULT_INTRO_BEATS;

    this.#rootNoteInteger = state.rootNoteInteger ??
      DEFAULT_ROOT_PITCH_INTEGER;
    this.#rootNoteName = state.rootNoteName ?? DEFAULT_ROOT_NOTE_NAME;
    this.#currentSequence = state.currentSequence ?? DEFAULT_NOTE_SEQUENCE;
    this.#currentSequenceThemeKey = state.currentSequenceThemeKey ??
      DEFAULT_NOTE_SEQUENCE_THEME_KEY;

    this.#tempo = state.tempo ?? DEFAULT_TEMPO;
    this.#setPlayingPatternDurations();
    this.#rootNoteOctave = state.rootNoteOctave ?? DEFAULT_ROOT_NOTE_OCTAVE;
    this.#noteDuration = state.noteDuration ?? DEFAULT_NOTE_DURATION;

    this.#playingPattern = state.playingPattern ?? DEFAULT_PLAYING_PATTERN;

    this.#numOctaves = state.numOctaves ?? DEFAULT_NUM_OCTAVES;
    this.#extraNotes = state.extraNotes ?? DEFAULT_EXTRA_NOTES;
    this.#extraRests = state.extraRests ?? DEFAULT_EXTRA_RESTS;

    // Update UI elements to reflect the loaded state
    (
      this.#shadowRoot.querySelector(
        `input[name="intro-beats"][value="${this.#introBeats}"]`,
      ) as HTMLInputElement
    ).checked = true;

    this.#enharmonicNoteSelector!.selectedNoteName = this.#rootNoteName;
    this.#noteSequenceSelector!.selectedNoteSequenceThemeKey =
      this.#currentSequenceThemeKey;

    this.#tempoText!.textContent = this.#tempo.toString();
    this.#tempoInput!.value = this.#tempo.toString();
    this.#rootNoteOctaveText!.textContent = this.#rootNoteOctave.toString();
    this.#rootNoteOctaveInput!.value = this.#rootNoteOctave.toString();
    this.#noteDurationText!.textContent = this.#noteDuration.toString();
    this.#noteDurationInput!.value = this.#noteDuration.toString();

    (
      this.#shadowRoot.querySelector(
        `input[name="pattern"][value="${this.#playingPattern}"]`,
      ) as HTMLInputElement
    ).checked = true;

    this.#numOctavesText!.textContent = this.#numOctaves.toString();
    this.#numOctavesInput!.value = this.#numOctaves.toString();
    this.#extraNotesText!.textContent = this.#extraNotes.toString();
    this.#extraNotesInput!.value = this.#extraNotes.toString();
    this.#extraRestsText!.textContent = this.#extraRests.toString();
    this.#extraRestsInput!.value = this.#extraRests.toString();
  }

  /**
   * Generates the sequence of notes for the exercise based on the current settings.
   * @private
   */
  #generateExercise() {
    this.#exerciseNotes = [];
    const rootNoteOctaveMidi = (this.#rootNoteOctave + 1) * 12; // Convert octave to MIDI

    // push the "0th" octave notes first
    // this happens in all cases, even if numOctaves is 0
    // the math is a little tricky here, because octave "0" is the "first" octave
    // and must be added first, in all cases
    // I thought this solution was the most clear
    this.#currentSequence.forEach((interval) => {
      this.#exerciseNotes.push(
        rootNoteOctaveMidi + this.#rootNoteInteger + interval,
      );
    });

    // if there are more octaves, add the notes for each extra octave
    // the math is a little tricky here, because octave "0" is the "first" octave
    for (let octave = 1; octave < this.#numOctaves; octave++) {
      this.#currentSequence.forEach((interval) => {
        this.#exerciseNotes.push(
          rootNoteOctaveMidi + this.#rootNoteInteger + octave * 12 + interval,
        );
      });
    }

    // Handle the top note of the scale and any extra notes
    if (this.#numOctaves > 0) {
      // Add the high root note for multi-octave scales
      this.#exerciseNotes.push(
        rootNoteOctaveMidi + this.#rootNoteInteger + this.#numOctaves * 12,
      );

      // Add extra notes if any, starting after the high root note
      if (this.#extraNotes > 0) {
        const baseNoteForExtraOctave = rootNoteOctaveMidi +
          this.#rootNoteInteger + this.#numOctaves * 12;
        for (let i = 0; i < this.#extraNotes; i++) {
          const intervalIndex = (i + 1) % this.#currentSequence.length;
          const interval = this.#currentSequence[intervalIndex];
          const octaveOffset =
            Math.floor((i + 1) / this.#currentSequence.length) * 12;
          this.#exerciseNotes.push(
            baseNoteForExtraOctave + interval + octaveOffset,
          );
        }
      }
    } else {
      // Handle the special case for 0 octaves with extra notes
      if (this.#extraNotes > 0) {
        const baseNoteForExtraOctave = rootNoteOctaveMidi +
          this.#rootNoteInteger;
        for (let i = 0; i < this.#extraNotes; i++) {
          const intervalIndex = i % this.#currentSequence.length;
          const interval = this.#currentSequence[intervalIndex];
          const octaveOffset =
            (Math.floor(i / this.#currentSequence.length) + 1) * 12;
          this.#exerciseNotes.push(
            baseNoteForExtraOctave + interval + octaveOffset,
          );
        }
      }
    }

    // descending part
    // avoid duplicating the last ascending note
    // avoid duplicating the first note of the pattern as well
    // so it loops seamlessly
    const descendingPart = [...this.#exerciseNotes].reverse().slice(1, -1);
    this.#exerciseNotes = this.#exerciseNotes.concat(descendingPart);

    // Add the root note again at the end before the rests
    if (this.#exerciseNotes.length > 0) {
      this.#exerciseNotes.push(this.#exerciseNotes[0]);
    }

    // extra rests at the end
    if (this.#extraRests > 0) {
      for (let i = 0; i < this.#extraRests; i++) {
        this.#exerciseNotes.push(null);
      }
    }

    this.#currentNoteIndex = 0; // Reset index when exercise is regenerated
    // console.log(this.#exerciseNotes.join(", "));
  }

  /**
   * The main animation loop for scheduling and playing notes.
   * @private
   */
  #animationLoop = () => {
    if (this.#isPaused) {
      this.#animationFrameId = requestAnimationFrame(this.#animationLoop);
      return;
    }

    const now = performance.now();
    const scheduleUntil = now + 100; // Look ahead 100ms

    while (this.#nextNoteTime < scheduleUntil) {
      const noteDelay = (this.#nextNoteTime - now) / 1000; // Delay in seconds
      this.#scheduleNote(noteDelay > 0 ? noteDelay : 0);
      this.#nextNoteTime += this.#playingPatternDurations[this.#playingPattern];
    }

    if (this.#isLooping) {
      this.#animationFrameId = requestAnimationFrame(this.#animationLoop);
    } else {
      // If not looping, check if we have played all notes
      if (this.#currentNoteIndex >= this.#exerciseNotes.length) {
        this.#stopLoop(); // Stop everything once the exercise is done
      }
    }

    // Remove intro active state once the main exercise starts
    if (this.#isIntroActive && now >= this.#nextNoteTime) {
      this.#isIntroActive = false;
      this.#introButton!.classList.remove("active");
    }
  };

  /**
   * Schedules a single note to be played.
   * @param {number} noteDelay - The delay in seconds before playing the note.
   * @private
   */
  #scheduleNote(noteDelay: number) {
    if (this.#currentNoteIndex >= this.#exerciseNotes.length) {
      if (this.#isLooping) {
        if (this.#extraRests > 0) {
          this.#currentNoteIndex = 0; // With rests, start from the root.
        } else {
          // If no rests, loop back to the second note to avoid repeating the root,
          // but only if the exercise has more than one note.
          this.#currentNoteIndex = this.#exerciseNotes.length > 1 ? 1 : 0;
        }
      } else {
        return; // Stop scheduling if not looping and at the end
      }
    }

    const pitch = this.#exerciseNotes[this.#currentNoteIndex];
    if (pitch !== null) {
      this.dispatchEvent(
        new CustomEvent("web-note-player-on", {
          detail: {
            midiNoteNumber: pitch,
            instrumentAudio: "guitar",
            noteDuration: this.#noteDuration,
            noteDelay: noteDelay,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this.#currentNoteIndex++;
  }

  /**
   * Starts the note exercise playback.
   * @param {boolean} loop - Whether the exercise should loop.
   * @private
   */
  #startLoop(loop: boolean) {
    this.#stopLoop(); // Clear any existing state first
    this.#isLooping = loop;
    this.#isPaused = false;
    this.#loopButton!.classList.toggle("active", loop);
    this.#pauseButton!.classList.remove("active");
    this.#introButton!.classList.remove("active");

    if (this.#exerciseNotes.length > 0) {
      this.#currentNoteIndex = 0;
      this.#nextNoteTime = performance.now();
      this.#animationFrameId = requestAnimationFrame(this.#animationLoop);
    } else {
      console.warn("No exercise notes generated to play.");
    }
  }

  /**
   * Stops the note exercise playback.
   * @private
   */
  #stopLoop() {
    this.#isLooping = false;
    this.#isPaused = false;
    this.#isIntroActive = false; // Ensure intro active state is reset on stop
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
    this.#currentNoteIndex = 0;
    this.#loopButton!.classList.remove("active");
    this.#pauseButton!.classList.remove("active");
    this.#introButton!.classList.remove("active");
  }

  /**
   * Toggles the looping of the exercise.
   * @private
   */
  #toggleLoop() {
    if (this.#isLooping) {
      this.#stopLoop();
    } else {
      this.#startLoop(true);
    }
  }

  /**
   * Toggles the pause state of the exercise.
   * @private
   */
  #togglePause() {
    if (!this.#isLooping && this.#currentNoteIndex === 0) return; // Can't pause if not started

    this.#isPaused = !this.#isPaused;
    this.#pauseButton!.classList.toggle("active", this.#isPaused);

    if (!this.#isPaused) {
      this.#nextNoteTime = performance.now(); // Resync timing when unpausing
      // If we were paused at the beginning of a stopped exercise, start it now
      if (!this.#isLooping) {
        this.#startLoop(false); // Start playback, but don't set it to loop
      }
    }
  }

  /**
   * Plays the exercise with a preceding intro count-in.
   * @private
   */
  #playWithIntro() {
    this.#stopLoop();
    if (this.#exerciseNotes.length === 0) {
      console.warn("No exercise notes generated to play.");
      return;
    }

    this.#isIntroActive = true;
    this.#introButton!.classList.add("active");

    const now = performance.now();
    const rootNote = this.#exerciseNotes[0];

    // Schedule the intro beats
    for (let i = 0; i < this.#introBeats; i++) {
      const noteDelay = (i * this.#playingPatternDurations["quarter"]) / 1000;
      this.dispatchEvent(
        new CustomEvent("web-note-player-on", {
          detail: {
            midiNoteNumber: rootNote,
            instrumentAudio: "guitar",
            noteDuration: this.#noteDuration,
            noteDelay: noteDelay,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }

    // Schedule the main exercise to start after the intro
    const introDurationMs = this.#introBeats *
      this.#playingPatternDurations["quarter"];
    this.#nextNoteTime = now + introDurationMs;
    this.#isLooping = true; // Always loop after an intro
    this.#isPaused = false;
    this.#loopButton!.classList.add("active");
    this.#pauseButton!.classList.remove("active");

    // Deactivate intro button after intro duration
    setTimeout(() => {
      this.#introButton!.classList.remove("active");
      this.#isIntroActive = false;
    }, introDurationMs);

    this.#currentNoteIndex = 0;
    this.#animationFrameId = requestAnimationFrame(this.#animationLoop);
  }
}

// Debounce utility
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
) {
  let timeout: number | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay) as unknown as number;
  };
}

customElements.define("note-exercise-looper", NoteExerciseLooper);
