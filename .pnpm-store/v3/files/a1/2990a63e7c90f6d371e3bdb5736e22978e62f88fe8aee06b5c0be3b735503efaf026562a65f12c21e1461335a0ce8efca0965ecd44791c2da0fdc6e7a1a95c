import './chunk-mock-date.304e29b1.mjs';
import { g as getWorkerState } from './chunk-utils-global.fa20c2f6.mjs';
import { w as withSafeTimers } from './chunk-utils-timers.b48455ed.mjs';

const rpc = () => {
  const { rpc: rpc2 } = getWorkerState();
  return new Proxy(rpc2, {
    get(target, p, handler) {
      const sendCall = Reflect.get(target, p, handler);
      const safeSendCall = (...args) => withSafeTimers(() => sendCall(...args));
      safeSendCall.asEvent = sendCall.asEvent;
      return safeSendCall;
    }
  });
};

export { rpc as r };
