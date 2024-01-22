"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[423],{8570:(e,t,n)=>{n.d(t,{Zo:()=>p,kt:()=>d});var r=n(79);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,r,i=function(e,t){if(null==e)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var l=r.createContext({}),c=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},p=function(e){var t=c(e.components);return r.createElement(l.Provider,{value:t},e.children)},h={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var n=e.components,i=e.mdxType,a=e.originalType,l=e.parentName,p=s(e,["components","mdxType","originalType","parentName"]),u=c(n),d=i,y=u["".concat(l,".").concat(d)]||u[d]||h[d]||a;return n?r.createElement(y,o(o({ref:t},p),{},{components:n})):r.createElement(y,o({ref:t},p))}));function d(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var a=n.length,o=new Array(a);o[0]=u;var s={};for(var l in t)hasOwnProperty.call(t,l)&&(s[l]=t[l]);s.originalType=e,s.mdxType="string"==typeof e?e:i,o[1]=s;for(var c=2;c<a;c++)o[c]=n[c];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}u.displayName="MDXCreateElement"},1802:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>o,default:()=>h,frontMatter:()=>a,metadata:()=>s,toc:()=>c});var r=n(7626),i=(n(79),n(8570));const a={sidebar_position:1},o="Initial sync",s={unversionedId:"internals/initial-sync",id:"internals/initial-sync",title:"Initial sync",description:"When a replica comes online, it must exchange information with the server until they share a common understanding of the operation history of the library in question.",source:"@site/docs/internals/initial-sync.md",sourceDirName:"internals",slug:"/internals/initial-sync",permalink:"/docs/internals/initial-sync",draft:!1,tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"tutorialSidebar",previous:{title:"How it works",permalink:"/docs/category/how-it-works"},next:{title:"Protocol assumptions",permalink:"/docs/internals/assumptions"}},l={},c=[{value:"A replica is not the first to initialize a new library",id:"a-replica-is-not-the-first-to-initialize-a-new-library",level:2},{value:"A replica goes &quot;truant&quot; and then reconnects",id:"a-replica-goes-truant-and-then-reconnects",level:2},{value:"A replica has lost its local data store",id:"a-replica-has-lost-its-local-data-store",level:2}],p={toc:c};function h(e){let{components:t,...n}=e;return(0,i.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"initial-sync"},"Initial sync"),(0,i.kt)("p",null,"When a replica comes online, it must exchange information with the server until they share a common understanding of the operation history of the library in question."),(0,i.kt)("p",null,"A naive approach would be to have the replica send over any changes it made since the last time it saw the server, and for the server to respond with any changes it received in the same time interval. And this, in fact, gets us very far."),(0,i.kt)("p",null,"However, there are a few contingencies to consider which require more robust protocols. In fact I'm writing this document to define and explore those before implementing said protocols, as a thought exercise."),(0,i.kt)("h2",{id:"a-replica-is-not-the-first-to-initialize-a-new-library"},"A replica is not the first to initialize a new library"),(0,i.kt)("p",null,"Suppose replicas A and B are both attempting to sync, for the first time, to a brand new Library 1. A gets there first, so the server receives and copies A's local history into its own database."),(0,i.kt)("p",null,"When B arrives, what should happen? B and A have entirely separate and theoretically irreconcilable histories. We could ",(0,i.kt)("em",{parentName:"p"},"attempt")," to merge them, but Verdant's assumption is that this could cause more harm than good."),(0,i.kt)("p",null,"Instead, the server will ignore B's incoming data and respond with its full storage, instructing B to reset its local state instead."),(0,i.kt)("p",null,"This means that if you write an app which optimistically chooses a library ID and tries to push local data to that library, it may end up with all your local data being lost!"),(0,i.kt)("p",null,"Instead, joining a library should be a very explicit action that the user consents to, and your app should be designed such that the only the first user to be given access to a library is under the assumption their data will be utilized. Subsequent joiners should be informed that their local changes will be lost."),(0,i.kt)("h2",{id:"a-replica-goes-truant-and-then-reconnects"},'A replica goes "truant" and then reconnects'),(0,i.kt)("p",null,"This is actually the same as the previous case! A replica used to be part of a library but hasn't been seen in so long that the server has kicked it out. When it reconnects, local changes are forfeit."),(0,i.kt)("h2",{id:"a-replica-has-lost-its-local-data-store"},"A replica has lost its local data store"),(0,i.kt)("p",null,"In theory, we'd see this crop up if the user cleared site data - like, the server would think it's seen the replica before, and only catch it up on recent changes, leading to incomplete history."),(0,i.kt)("p",null,"However, it doesn't actually happen, because the replica ID is also stored alongside operations and baselines. So when a user clears the storage, the replica reconnects as a new identity, and receives the full history in return."))}h.isMDXComponent=!0}}]);