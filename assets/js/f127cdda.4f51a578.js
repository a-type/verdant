"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[6362],{8570:(e,t,n)=>{n.d(t,{Zo:()=>c,kt:()=>d});var r=n(79);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function a(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var l=r.createContext({}),p=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):a(a({},t),e)),n},c=function(e){var t=p(e.components);return r.createElement(l.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},m=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,i=e.originalType,l=e.parentName,c=s(e,["components","mdxType","originalType","parentName"]),m=p(n),d=o,y=m["".concat(l,".").concat(d)]||m[d]||u[d]||i;return n?r.createElement(y,a(a({ref:t},c),{},{components:n})):r.createElement(y,a({ref:t},c))}));function d(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var i=n.length,a=new Array(i);a[0]=m;var s={};for(var l in t)hasOwnProperty.call(t,l)&&(s[l]=t[l]);s.originalType=e,s.mdxType="string"==typeof e?e:o,a[1]=s;for(var p=2;p<i;p++)a[p]=n[p];return r.createElement.apply(null,a)}return r.createElement.apply(null,n)}m.displayName="MDXCreateElement"},6774:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>a,default:()=>u,frontMatter:()=>i,metadata:()=>s,toc:()=>p});var r=n(7626),o=(n(79),n(8570));const i={sidebar_position:2},a="Protocol assumptions",s={unversionedId:"internals/assumptions",id:"internals/assumptions",title:"Protocol assumptions",description:"Collecting some thoughts about assumptions made in Verdant's sync protocols. May format this to be more readable at some point, but for now it's mostly for me (doubt you're considering implementing your own replica client).",source:"@site/docs/internals/assumptions.md",sourceDirName:"internals",slug:"/internals/assumptions",permalink:"/docs/internals/assumptions",draft:!1,tags:[],version:"current",sidebarPosition:2,frontMatter:{sidebar_position:2},sidebar:"tutorialSidebar",previous:{title:"Initial sync",permalink:"/docs/internals/initial-sync"},next:{title:"Entity IDs",permalink:"/docs/internals/entity-ids"}},l={},p=[],c={toc:p};function u(e){let{components:t,...n}=e;return(0,o.kt)("wrapper",(0,r.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"protocol-assumptions"},"Protocol assumptions"),(0,o.kt)("p",null,"Collecting some thoughts about assumptions made in Verdant's sync protocols. May format this to be more readable at some point, but for now it's mostly for me (doubt you're considering implementing your own replica client)."),(0,o.kt)("p",null,"A replica always does a ",(0,o.kt)("inlineCode",{parentName:"p"},"sync")," exchange (",(0,o.kt)("inlineCode",{parentName:"p"},"sync"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"sync-resp"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"sync-ack"),") before sending any other messages (with the exception of ",(0,o.kt)("inlineCode",{parentName:"p"},"presence-update")," which may be sent in parallel)"),(0,o.kt)("p",null,"Every operation which arrives to the server is guaranteed to be earlier in timestamp than any subsequently sent operations. In other words, replicas ensure operations are sent in time order, whether they be in ",(0,o.kt)("inlineCode",{parentName:"p"},"sync")," or ",(0,o.kt)("inlineCode",{parentName:"p"},"op")," messages. Hence always ",(0,o.kt)("inlineCode",{parentName:"p"},"sync")," before sending any ",(0,o.kt)("inlineCode",{parentName:"p"},"op"),"s. Internal client batching behavior must also account for this (in the client this is ensured by rewriting outgoing operation timestamps to ",(0,o.kt)("inlineCode",{parentName:"p"},"now")," before flushing a batch)"))}u.isMDXComponent=!0}}]);