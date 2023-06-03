---
'@verdant-web/store': minor
'@verdant-web/common': patch
---

Verdant's client no longer applies changes from _future versions of your schema_ to local data. These changes are still stored and synced, but they will not be reflected in the application. This change is necessary to ensure data integrity with the code that's actually running on your device-- if a future schema changes the shape of the data, but the current client doesn't have that change yet, any data that reflects those changes could be reshaped and violate the expected types in the older code.

This is technically a breaking change but I would hope nobody is relying on that behavior for some reason.

I've added an event you can subscribe to on the client called `futureSeen`. If the client notices a change from a future version of the app, it will fire this event. You can subscribe to it to prompt the user to reload the page and get the latest code. Otherwise, in a realtime scenario, they simply won't see the changes the other client is making.
