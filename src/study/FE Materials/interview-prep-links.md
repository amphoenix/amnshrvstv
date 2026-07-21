# FE Interview Prep — Links & Topics

Saved from email, Sat Apr 12 2025.

## Resources

- [Mayukh's react-interview-experience repo](https://github.com/mayukhkchanda/react-interview-experience)
- [JavaScript interview questions](https://github.com/sudheerj/javascript-interview-questions)
- [React interview questions](https://github.com/sudheerj/reactjs-interview-questions)
- [TypeScript interview questions (beginner to advanced)](https://codewithpawan.medium.com/typescript-interview-questions-from-beginners-to-advanced-part-1-b749513faab0)
- [HTML5 interview questions](https://www.geeksforgeeks.org/html-interview-questions/)
- [CSS3 interview questions](https://www.geeksforgeeks.org/css-interview-questions/)
- [What is a CSS preprocessor](https://www.geeksforgeeks.org/what-is-a-css-preprocessors/)
- [Web Vitals](https://web.dev/articles/vitals)
- [Browser rendering pipeline](https://web.dev/articles/rendering-performance)
- [How the browser renders a web page — CSSOM/DOM/render engine](https://anushchakhoyan.medium.com/how-the-browser-renders-a-web-page-cssom-render-engine-c395d9f9cbda)
- [JavaScript design patterns explained](https://www.freecodecamp.org/news/javascript-design-patterns-explained/)
- [Namaste JS — understanding JS concepts](https://youtu.be/pN6jk0uUrD8?si=WT_43s8BFrSMn84y)
- [Roadside Coder — JS output-based questions](https://www.youtube.com/@RoadsideCoder/playlists)
- [Chirag Goel — System Design](https://www.youtube.com/@engineerchirag)
- [System Design (preferred over Chirag Goel)](https://www.youtube.com/watch?v=5vyKhm2NTfw)

## Machine coding practice

**Big Frontend Dev** — practice machine coding round in JS.

Commonly asked ones: Todos, Counter, Nested Checkbox, Debounce, Autocomplete.

## Misc topics

1. **Loaders** — Webpack transforms for non-JS files (CSS, images, TS, etc.) so the bundler can process them as modules. Examples: `babel-loader` (transpile JS), `css-loader`/`style-loader`, `file-loader`. Loaders chain right-to-left in the config.

2. **Preprocessors** — CSS preprocessors (Sass, Less, Stylus) add variables, nesting, mixins, and functions on top of CSS, then compile down to plain CSS before shipping to the browser.

3. **Babel** — a JS compiler that transpiles modern syntax (ES6+, JSX, TS) into backward-compatible JS via plugins/presets (e.g. `@babel/preset-env`), so newer syntax runs on older browsers/engines.

4. **Polyfills** — runtime code that implements a feature missing in an older environment (e.g. `Array.prototype.flat`, `Promise`, `fetch`). Different from Babel: Babel changes *syntax*, polyfills add missing *runtime behavior*. See the runnable playground below for hand-rolled polyfills of common array/function/Promise methods.

5. **JS output-based questions** — snippet-based interview questions ("what does this log?") that probe closures, hoisting, the event loop, `this` binding, and type coercion.

6. **JS engine** — the runtime that parses and executes JS (V8, SpiderMonkey, JavaScriptCore). Includes a parser, an interpreter/JIT compiler, the call stack, the heap, and (in browsers) ties into the event loop and Web APIs.

7. **Working of weblinks in the browser** — what happens on navigation: parse URL → DNS lookup → TCP/TLS handshake → send HTTP request → receive response → parse HTML → build DOM + CSSOM → construct render tree → layout → paint.

8. **Security measures in FE** — sanitize/escape untrusted input to prevent XSS, use a Content-Security-Policy, avoid `eval`/unsanitized `innerHTML`, set cookies `HttpOnly`/`Secure`/`SameSite`, use CSRF tokens for state-changing requests, serve everything over HTTPS, audit dependencies.

9. **CORS** — Cross-Origin Resource Sharing. A browser security mechanism that blocks a page from reading responses from a different origin unless the server opts in via `Access-Control-Allow-Origin` (and related headers). Non-simple requests trigger a preflight `OPTIONS` call first.

10. **Cache mechanism / browser cache** — controlled via `Cache-Control`, `ETag`, `Last-Modified` HTTP headers; browsers keep memory and disk caches, and Service Workers add a programmable Cache API on top for offline/PWA use cases.

11. **HTTP 1 / 1.1 / 2 / 3 — diff** — HTTP/1.0: one request per TCP connection. HTTP/1.1: added keep-alive and pipelining. HTTP/2: multiplexes many requests over a single connection, compresses headers, supports server push. HTTP/3: runs over QUIC (UDP) instead of TCP, cutting connection setup latency and eliminating head-of-line blocking.

12. **Accessibility** — building UI usable by people with disabilities: screen reader support, full keyboard navigation, sufficient color contrast, respecting reduced-motion preferences, meaningful alt text.

13. **WCAG standards** — Web Content Accessibility Guidelines. Conformance levels A / AA / AAA, organized around four principles: Perceivable, Operable, Understandable, Robust (POUR).

14. **ARIA labels / text-to-speech / speech-to-text** — ARIA attributes (`aria-label`, `aria-live`, `role`, etc.) add accessibility semantics when native HTML markup isn't expressive enough on its own. Text-to-speech is what screen readers use to voice content; speech-to-text covers voice input, e.g. the Web Speech API.

15. **Optimization** — FE performance techniques: code-splitting/lazy-loading routes, memoizing expensive renders, optimizing images, avoiding unnecessary re-renders, caching, tree-shaking to cut bundle size, virtualizing long lists.
