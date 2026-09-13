import { handleRequest } from './tutor.js';

export default {
  fetch(request, env, ctx) { return handleRequest(request, env, ctx); },
};
