---
sidebar_position: 2
---

# The Verdant manifesto on sustainable software

Verdant was designed for purpose, with a built-in business model meant to enable the gradual and sustainable growth of your consumer app as a small business.

It may seem crude to be thinking about business models when designing a software library (I would certainly understand that reaction, I'm no fan of "business" as it's done across the software space today), but all code is a tool, and a tool is designed to solve a set of problems. I consider it responsible to try to define both the problems and solutions up front.

## The model

Here's an overview of the "business model" of Verdant:

1. Users can use the product for free on their own device, and free users don't cost anything (or next to nothing) to "host."
2. Only paying subscribers utilize paid server infrastructure. Meaning, every server request and megabyte of database storage has associated revenue.

In other words, I'm using local-first not just as a technical principle, but as a tool to enable a product model which satisfies user expectations of a free experience on the web, but also provides a clear value proposition for purchase.

I _like_ having technical principles like "local-first," but I'm even more excited by what these concepts can enable in terms of building more authentic, sustainable, and personable software products online. Or, if the "products" nomenclature turns you off... web apps.

### What you won't get

This model comes with some limitations and biases. These might either be refreshing or disappointing to you:

- You probably won't make a multi-billion valued unicorn with Verdant
- You probably can't use Verdant as effectively in B2B scenarios (or at least it's not really designed for that)
- You can't collect a bunch of information on people very easily, so it'll be hard to tell why users don't convert to paid subscriptions without engaging them yourself (or instrumenting your own analytics). They won't even exist on your server.

The first one is probably the kicker. It's other side of the sustainable software coin. The point is grow carefully, grow gradually, grow with a plan. That means you're not optimizing for an overnight explosion. It also means you don't get very much up-front. No seed rounds.

> **Note:** as of writing there's nothing in the license for Verdant which would prevent you from doing any of these things. I suppose you could do a VC-funded startup using Verdant if you want. But that's not the use case I'm designing for. I won't make decisions that actively hamper it unless they're required to pursue the sustainable vision. Can't think of any so far.

### What does "sustainable" mean then?

I'll define it like this:

The costs of maintaining the software should:

1. Be clearly predictable based on measurable usage
2. Start as low as possible
3. Track revenue opportunity: costs only increase as revenue increases; costs decrease when revenue decreases

Ideally, economies of scale should see the revenue growth outpace cost, but if the relationship is linear that's still sustainable. The idea is always to have _some_ profit, and not to create a scenario where there is risk of unforeseen costs or loss of revenue that can't be accounted for.

> **Why is profit, not break-even, the benchmark?** In an ideal world I could just make cool apps and not have any bills, but the goal of sustainable software (in my view) is to build a small business and pay those bills. However, the way profit is acquired is vastly different from how VC-funded stuff works, obviously.
>
> Another thing to consider here is the cost of your time. Break-even would leave you with a time deficit, and time is valuable. Profit is your compensation for time spent building. You deserve it!
>
> Contrast that against seed funding injected before you've proven anything yet, before you've even made a sale. You don't deserve that yet. Instead you sign a devil's bargain to prove you deserve it _after the fact._ Sustainable software is for folks who find that system life-draining and ethically disorienting, and want a path out.

### The short version

So, basically, if you want to follow this model as designed, you should use the Verdant client to pack as much of an enjoyable local app experience into the free usage as you can (to convince new users your product is valuable to them), then present users with an onramp to a paid subscription which gives sync and realtime access via your server. That means every user account is also a subscriber. Almost every user could benefit from sync across multiple devices. Many would also benefit from a shared account with friends or family. If your app experience doesn't benefit from realtime, you can decrease load by tweaking sync settings to only periodic push/pull requests, too. It's up to you to determine the cost of your subscription.

The rest of this page is basically outlining the _how_ and _why_ of that model.

## How Verdant achieves these goals

Here are the key features of Verdant which aim to provide you with the tools to build sustainable software, as I've defined it:

### Local-first, not local-capable

The terminology has already gotten kind of muddy in this space. The idea of local-first here means users can visit your static webpage and immediately start using it as a functional app. One visit to load the code is all it takes; no login, no download of a remote data store, etc.

When users want to start going online, they bring their local data with them to your server, who learns of their existence for the first time. If they never go online, they never have to talk to your server, so they never cost you money.

So Verdant, as the name suggests, is local-first. Even a user who signs up day 1 has first had a purely local experience.

### The server is the gateway to a rich feature set

This will be the longest section, as it focuses on a core _design decision_ of Verdant: server-client architecture.

This may be a controversial decision for the library. It _is feasible_ to achieve a lot of the value of Verdant without a server in the middle. You could (with the help of some basic signalling infrastructure) establish peer-to-peer networks of user-owned devices for sync and realtime capabilities. Many, if not most, frameworks in this space are either built around this concept or explicitly support it. If that sounds ideal to you, you'll want to continue researching!

However, Verdant explicitly _does not_ support peer-to-peer. Everything goes through your server. This is a case of choosing the less glamorous, even less idealized, technical option for the explicit reason of supporting a business model. I have chosen to gate core features like sync and realtime behind a server which you are empowered to charge your users access for. Yuck!

I'm not mocking anti-capitalists. I hope I fall in that category. What I am trying to do is be practical. The market is the primary game of our present society, and as long as that's true, I believe it's worth trying to find ways to play the game ethically.

> Allow me to soapbox here: I think there is promise in a lot of these folks who are trying to invent a new game. I hope they succeed. But I am skeptical this is a problem which can be solved _purely with technology_. Many folks buying into novel, peer-to-peer systems seem to put a lot of faith that with the right application of cryptography, we can bypass the deep flaws in current governments and the global economy, and jump right to a new utopia. Consider me a skeptic.
>
> And as someone whose main talent _is_ technology, this skepticism involves accepting the reality that I don't have access to the tools required to fix our mess and usher in a better game, a better societal narrative than the 'market.' I think we collectively have those tools, as a society, but I can't write a program to unlock that potential. It will take time and social effort.
>
> I think there's more to say here, but I should write on it separately rather than continue to bloat this documentation.

To summarize, Verdant explicitly chooses to use the server, and access to it, as an opportunity for revenue. You are welcome to give free access to your server if you wish. But the design of the framework does not rebel against the server-client model which has so far defined "web 2.0," it attempts to embrace it and put it to work for you in the format of a small business. It aims to give you the tools to build revenue, and indeed profit, as you grow your app.

Giving away your product for free seems 'nice.' But it creates a rift in the whole system, turns users into objects to extract value from, and puts businesses in existential relationship to "angels" and other VC. The desire to grow the product userbase is no longer directly tied to increasing the value of those user's lives through access to your useful tool or service. Onboarding a user costs _you_ money, and leaves _you_ looking for a return on that cost. This is backwards. And the backwards-ness propagates into all sorts of irrational systems which have become the hallmark of consumer software on today's internet.

Just charge your users.

### Scaling down

Here's another idea Verdant tries to embrace: the arrow does not, indeed, always go up.

It is easy to constantly grow your userbase when accounts are free and hard to delete. That's why speculators care about abstractions like "Daily Active User" rather than a `SELECT COUNT(*) FROM users` when assessing the health of a product.

In contrast, Verdant is designed to let users leave. When someone decides to stop paying for your product, they get to walk away with all of their data still locally accessible on their device. And _you_ get to delete _everything._

And if they decide to come back, they give their data back to you, you provision their place on your servers again, and everything smoothly chugs along.

You don't need to worry about archiving data so the user doesn't lose it; they always have it. Purge it. Downscale your storage volume. Drop a CPU. If everyone leaves, spin down the server and let the app lie fallow for a while. Set up an email alert if someone signs up so you know to boot the server back up. Or automate it. Maybe your time will come later. In the meantime, relax, your bill is the cost of a domain name. Maybe try a new project and see if you find better traction there.

Verdant tries to make scaling your app like doing branch-management in a restaurant sim videogame. You're getting a lot of traffic, your flagship location is overwhelmed! Open up a new franchise (spin up a new server) and start directing some users there. _You know how much that will cost, and how much they will be paying._ You can do the math.

A new competitor has arrived and is stealing your customers! Now that second branch is in the red; not enough subscriptions are active to pay the bills on both. Simple, send any remaining users on Server 2 back to Server 1, and pull it down. Even if you screw up, nobody loses their data in the long run, they can even keep editing it while you sort out your ops. They may not even notice.

### Sync flexibility

Another feature which helps you tune your business is the flexibility of transport which Verdant exposes for sync. If your app only needs basic device sync, you don't need to bother with websockets and constant network chatter. Depending on your use case, you could turn the push/pull sync frequency down to every 5 minutes or more.

Permission to send data over a socket is gated and controlled by you. So if you don't need realtime features, you don't ever have to allow or utilize it. Save yourself some money in traffic, and then charge less for your subscription&mdash;since you're offering less, as well.

If you do add multiplayer for whatever feature comes down the line someday, you can even setup pricing tiers for access. It's all up to you.

### Future-proofing

Here's another opinion about software development: it's never perfect. Even if you write exquisite, flawless code... one day, your problem will be redefined. Users will let you know they expected something different. The game will change, and your old data model isn't going to cut it anymore.

In a traditional cloud-hosted model, you'd do some diagramming, tweak your database schema to support the new system, and then schedule some time to deploy a migration. Users wake up the next day, update the app, and find their data has already been massaged into a new shape, ready for 2.0.

We don't get that in local-first world. There's no magic spell you can utter overnight to change your app's data across everyone's devices. You can update your own server, but the clients who connect will still be running 1.0 when they do.

And some might not get the memo for a _while._ A user went off the grid for a week, but she made use of your fancy offline-capable app to add items to her grocery list. Her phone doesn't know you refactored the data model to support categories now. What's going to happen when she gets signal again?

This is a class of problem all its own, and solving it can be a headache. Verdant is designed to support migration of data, at any time, offline or online, so you don't have to worry about it. Once the user receives the new code, the Verdant client will upgrade their data to the right shape, without causing inconsistencies if other offline clients do the same thing at a later time.

This all works in service of the user's ability to drop their subscription, keep their data intact, not interact with your server at all (i.e. cost you little to nothing), then return sometime and pick up where they left off.

## The hope for consumer web software

The culmination of all of this is my hope that we can create more sane, safe, and fun apps for everyday users. Breaking free from the self-destructive cycle of VC investment, data harvesting, invasive ads, and addictive psychology.

Rather than using new technological systems to try to solve these problems, I'm trying to revisit the incentives we've built into our current way of doing things, disentangle, and re-apply some existing solutions to a more well-defined problem.

It's my dream to enable myself and anyone else interested to run a little business, or a few, on people's phones and computers. The equivalent of a nice, local bakery.

If that sounds appealing, give Verdant a spin, and tell me if you think it falls short of delivering on that solution.
