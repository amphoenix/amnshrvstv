# JS Polyfills Playground

Hand-rolled implementations of common built-ins and utilities. Each one below is a **separate, self-contained snippet with its own Run button and terminal** — no shared state between them.

Reduce and Promise.allSettled below include a short note on an easy-to-miss edge case in each — common interview gotchas worth knowing.

## 1. Debounce

Delays invocation until `delay` ms have passed with no further calls — each call resets the timer.

```js-run
function aman() {
  console.log('aman');
}

const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const debouncedAman = debounce(aman, 1500);
console.log('calling debounced fn 3 times rapidly...');
debouncedAman();
debouncedAman();
debouncedAman();
console.log('only the last call should log "aman" after ~1.5s');
```

## 2. Throttle

Guarantees at most one call per `delay` ms, regardless of how often it's invoked.

This demo uses simulated rapid calls instead of a real `mousemove` listener, so the throttling behavior is visible directly in the output panel.

```js-run
const throttle = function (func, delay) {
  let throttled = false;
  return function (...args) {
    if (!throttled) {
      throttled = true;
      func.apply(this, args);
      setTimeout(() => {
        throttled = false;
      }, delay);
    }
  };
};

function logPosition(x, y) {
  console.log(`position: (${x}, ${y})`);
}

const throttledLog = throttle(logPosition, 500);

let i = 0;
const interval = setInterval(() => {
  i++;
  throttledLog(i * 10, i * 5);
  if (i >= 10) {
    clearInterval(interval);
    console.log('done — only ~2 of the 10 rapid calls should have logged');
  }
}, 100);
```

## 3. Map

```js-run
Array.prototype.myMap = function (cb) {
  let stack = [];
  for (let i = 0; i < this.length; i++) {
    stack.push(cb(this[i], i, this));
  }
  return stack;
};

const blah = [1, 2, 3, 4, 5];
console.log(blah.myMap((item) => item * 2));
```

## 4. Filter

```js-run
Array.prototype.myFilter = function (cb) {
  let stack = [];
  for (let i = 0; i < this.length; i++) {
    if (cb(this[i], i, this)) {
      stack.push(this[i]);
    }
  }
  return stack;
};

const blah = [1, 2, 3, 4, 5];
console.log(blah.myFilter((item) => item > 2));
```

## 5. Reduce

**Gotcha:** deciding whether to call the callback with `accumulator ? cb(...) : this[i]` — a *truthy* check — is a common mistake. If the running accumulator ever becomes a legitimate falsy value (`0`, `''`, `false`), that check silently discards it and substitutes the current item instead of passing it to the callback. The real `reduce` spec also has a "no initial value" case: start from `this[0]` and iterate from index 1. Both are handled correctly below.

```js-run
Array.prototype.myReduce = function (cb, initialValue) {
  let startIndex = 0;
  let accumulator = initialValue;

  if (accumulator === undefined) {
    accumulator = this[0];
    startIndex = 1;
  }

  for (let i = startIndex; i < this.length; i++) {
    accumulator = cb(accumulator, this[i], i, this);
  }

  return accumulator;
};

const blah = [1, 2, 3, 4, 5];
console.log('sum:', blah.myReduce((a, b) => a + b));
console.log('with initial 0:', blah.myReduce((a, b) => a + b, 0));

// this is the falsy-accumulator case the truthy-check gotcha above breaks:
const withZero = [5, -5, 3];
console.log('subtract to zero then add 3:', withZero.myReduce((a, b) => a + b));
```

## 6. For Each

```js-run
Array.prototype.myEach = function (cb) {
  for (let i = 0; i < this.length; i++) {
    cb(this[i], i, this);
  }
};

const blah = [1, 2, 3, 4, 5];
blah.myEach((item, index) => console.log(`Item: ${item}, Index: ${index}`));
```

## 7. Flat

```js-run
Array.prototype.myFlat = function (depth = 1) {
  if (depth < 0) depth = 1;
  function flat(arr, depth, output) {
    for (let i = 0; i < arr.length; i++) {
      if (Array.isArray(arr[i]) && depth > 0) {
        flat(arr[i], depth - 1, output);
      } else {
        output.push(arr[i]);
      }
    }
    return output;
  }
  return flat(this, depth, []);
};

const nestedArray = [1, 2, [3, [4, 5]], 6];
console.log('depth 1:', nestedArray.myFlat(1));
console.log('depth 2:', nestedArray.myFlat(2));
```

## 8. Call

```js-run
Function.prototype.myCall = function (context = globalThis, ...args) {
  const uniqueKey = Symbol('fn');
  context[uniqueKey] = this;
  const result = context[uniqueKey](...args);
  delete context[uniqueKey];
  return result;
};

function greet(message) {
  console.log(`${message}, ${this.name}`);
}

const person = { name: 'John' };
greet.myCall(person, 'Hello');
```

## 9. Bind

```js-run
Function.prototype.myBind = function (context, ...boundArgs) {
  const func = this;
  return function (...args) {
    return func.apply(context, [...boundArgs, ...args]);
  };
};

function greet(greeting, name) {
  return `${greeting}, ${name}!`;
}

const boundGreet = greet.myBind(null, 'Hello');
console.log(boundGreet('Alice'));
```

## 10. Promise.all

```js-run
Promise.myAll = function (promises) {
  return new Promise(function (resolve, reject) {
    let count = 0;
    const result = [];
    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then((value) => {
          result[index] = value;
          count++;
          if (count === promises.length) resolve(result);
        })
        .catch(reject);
    });
  });
};

const p1 = Promise.resolve(1);
const p2 = Promise.resolve(2);
const p3 = Promise.resolve(3);

Promise.myAll([p1, p2, p3])
  .then((values) => console.log('all resolved:', values))
  .catch((error) => console.error('rejected:', error));

const p4 = Promise.reject('p4 failed');
Promise.myAll([p1, p4, p3])
  .then((values) => console.log(values))
  .catch((error) => console.error('one rejects → whole thing rejects:', error));
```

## 11. Promise.race

```js-run
Promise.myRace = function (promises) {
  return new Promise(function (resolve, reject) {
    promises.forEach((promise) => {
      Promise.resolve(promise).then(resolve).catch(reject);
    });
  });
};

const fast = new Promise((resolve) => setTimeout(resolve, 100, 'fast'));
const slow = new Promise((resolve) => setTimeout(resolve, 500, 'slow'));

Promise.myRace([slow, fast])
  .then((value) => console.log('first to settle:', value))
  .catch((error) => console.error(error));
```

## 12. Promise.allSettled

**Gotcha:** it's tempting to call `reject()` when an individual promise rejects, but `allSettled` must always **resolve** once every promise has settled, capturing each outcome (fulfilled or rejected) in the result array — the outer promise itself never rejects. Using `.finally` to track the completion count (instead of duplicating it across `.then`/`.catch`) keeps this correct by construction.

```js-run
Promise.mySettled = function (promises) {
  return new Promise(function (resolve) {
    let count = 0;
    const result = [];
    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then((value) => {
          result[index] = { status: 'fulfilled', value };
        })
        .catch((reason) => {
          result[index] = { status: 'rejected', reason };
        })
        .finally(() => {
          count++;
          if (count === promises.length) resolve(result);
        });
    });
  });
};

const ok = Promise.resolve('ok');
const fail = Promise.reject('boom');

Promise.mySettled([ok, fail]).then((value) => console.log(value));
```

## 13. setTimeout (via requestAnimationFrame)

```js-run
function customSetTimeout(callback, delay) {
  let startTime = Date.now();
  function checkTime() {
    let currentTime = Date.now();
    if (currentTime - startTime >= delay) {
      callback();
    } else {
      window.requestAnimationFrame(checkTime);
    }
  }
  window.requestAnimationFrame(checkTime);
}

customSetTimeout(() => {
  console.log('This message is delayed by 1000 milliseconds');
}, 1000);
```
