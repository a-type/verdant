/*
When communicating via `postMessage()` (`Worker.postMessage()` or
`window.postMessage()`), the browser will use a similar algorithm as Typeson
does to encapsulate and revive all items in the structure (aka the structured
clone algorithm). This algorithm supports all built-in types as well as many
DOM types. Therefore, only types that are not included in the structured clone
algorithm need to be registered, which is:

* Error
* Specific Errors like SyntaxError, TypeError, etc.
* Any custom type you want to send across window- or worker boundraries

This preset will only include the Error types and you can register your
custom types after having registered these.
*/

import error from '../types/error.js';
import errors from '../types/errors.js';

const postmessage = [
    error,
    errors
];

export default postmessage;
