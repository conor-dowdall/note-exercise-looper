# Project: Muso Dojo

Muso Dojo - Play Music

## 1. Overview

This project is a web-based suite of music practice tools designed to help
musicians improve their skills through interactive applications. A good
understanding of music theory (scales, chords, intervals, notation) is useful
for contributing to this project.

## 2. Technology Stack

- **Runtime:** Deno
- **Package Manager & Registry:** JSR.io
- **Frontend:** Vanilla Web Components (no frameworks)
- **Styling:** Use modern vanilla CSS utilizing features like nesting, flex,
  grid, and custom properties. **HTML:** Use semantic elements instead of custom
  implementations involving javascript, when available.
- **JavaScript/Typescript:** Use modern syntax. Backward compatibility is not a
  concern. Use the latest stable version when writing code. Always use the
  modern alternative.

## 3. Coding Style & Conventions

### 3.1. Naming

- Use expressive and descriptive names for variables, functions, and classes.
- Avoid shorthand or abbreviated names.

### 3.2. File & Module Structure

- The main entry point for any module must be a `mod.ts` file, following Deno
  conventions.
- Code should be organized logically into subdirectories within the `src/`
  directory.

### 3.3. Documentation

- All modules, classes, methods, and functions must be thoroughly documented
  using JSDoc-style comments.
- Use inline comments for complicated sections of code inside of a code block.
- Documentation must be kept up-to-date with any code changes.
- The documentation should be written to be as helpful as possible within a
  VSCode environment, leveraging its IntelliSense features.

#### JSDoc Requirements

- Every file/module must begin with a JSDoc block containing an `@module` tag.
  This first comment block is considered the module's documentation.
- Use other relevant JSDoc tags like `@param`, `@returns`, `@example`, and
  `@see`.
- For linking to other symbols, use `{@link}`.
- Consider using other supported tags like `@deprecated`, `@template`,
  `@property`, `@throws`, and `@remarks` when appropriate.

**Example:**

````typescript
/**
 * @module my-module
 * This module provides functions for doing awesome things.
 *
 * @example
 * ```ts
 * import { awesome } from "jsr:@scope/my-module";
 *
 * awesome();
 * ```
 */

/**
 * A class representing a musical note.
 * @see {@link https://en.wikipedia.org/wiki/Musical_note}
 */
export class Note {
  // ...
}
````

### 3.4. Web Component Best Practices

- Web Components should be self-contained and reusable.
- Use modern patterns for lifecycle management. For instance, manage event
  listeners and other subscriptions by creating an `AbortController` in
  `connectedCallback` and calling its `abort()` method in
  `disconnectedCallback`.

**Example:**

```typescript
class MyComponent extends HTMLElement {
  #abortController: AbortController | null = null;

  connectedCallback() {
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    this.addEventListener(
      "click",
      (e) => {
        // ...
      },
      { signal },
    );
  }

  disconnectedCallback() {
    this.#abortController?.abort();
  }
}
```
