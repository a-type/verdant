"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[7467],{8570:(e,t,n)=>{n.d(t,{Zo:()=>p,kt:()=>y});var r=n(79);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function a(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function c(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var s=r.createContext({}),l=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):a(a({},t),e)),n},p=function(e){var t=l(e.components);return r.createElement(s.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,i=e.originalType,s=e.parentName,p=c(e,["components","mdxType","originalType","parentName"]),d=l(n),y=o,m=d["".concat(s,".").concat(y)]||d[y]||u[y]||i;return n?r.createElement(m,a(a({ref:t},p),{},{components:n})):r.createElement(m,a({ref:t},p))}));function y(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var i=n.length,a=new Array(i);a[0]=d;var c={};for(var s in t)hasOwnProperty.call(t,s)&&(c[s]=t[s]);c.originalType=e,c.mdxType="string"==typeof e?e:o,a[1]=c;for(var l=2;l<i;l++)a[l]=n[l];return r.createElement.apply(null,a)}return r.createElement.apply(null,n)}d.displayName="MDXCreateElement"},7449:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>s,contentTitle:()=>a,default:()=>u,frontMatter:()=>i,metadata:()=>c,toc:()=>l});var r=n(7626),o=(n(79),n(8570));const i={sidebar_position:3},a="Entity IDs",c={unversionedId:"internals/entity-ids",id:"internals/entity-ids",title:"Entity IDs",description:'Each "entity" (basically any document or nested object) has a unique ID (referred to in Verdant source code as an "oid" or "object ID"). This ID links operations to the entity they operate on.',source:"@site/docs/internals/entity-ids.md",sourceDirName:"internals",slug:"/internals/entity-ids",permalink:"/docs/internals/entity-ids",draft:!1,tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"tutorialSidebar",previous:{title:"Protocol assumptions",permalink:"/docs/internals/assumptions"},next:{title:"React Router",permalink:"/docs/react-router"}},s={},l=[],p={toc:l};function u(e){let{components:t,...n}=e;return(0,o.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"entity-ids"},"Entity IDs"),(0,o.kt)("p",null,'Each "entity" (basically any document or nested object) has a unique ID (referred to in Verdant source code as an "oid" or "object ID"). This ID links operations to the entity they operate on.'),(0,o.kt)("p",null,"Root entities (documents) derive their ID directly from their collection and primary key:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre"},"{collection}/{primaryKey}\n")),(0,o.kt)("p",null,"Nested entities (fields) derive their IDs from their root, plus a random segment:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre"},"{collection}/{primaryKey}:{random}\n")),(0,o.kt)("p",null,"When deleting a document, we scan and delete all operations and baselines for all related sub-objects, basically deleting anything which matches an ID pattern:"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre"},"{collection}/{primaryKey}(:[w+])?\n")))}u.isMDXComponent=!0}}]);