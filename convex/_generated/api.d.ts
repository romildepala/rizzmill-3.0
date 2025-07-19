/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as emailVerification from "../emailVerification.js";
import type * as errors from "../errors.js";
import type * as fileValidation from "../fileValidation.js";
import type * as generations from "../generations.js";
import type * as http from "../http.js";
import type * as logging from "../logging.js";
import type * as modelWeights from "../modelWeights.js";
import type * as passwordReset from "../passwordReset.js";
import type * as router from "../router.js";
import type * as testTraining from "../testTraining.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  emailVerification: typeof emailVerification;
  errors: typeof errors;
  fileValidation: typeof fileValidation;
  generations: typeof generations;
  http: typeof http;
  logging: typeof logging;
  modelWeights: typeof modelWeights;
  passwordReset: typeof passwordReset;
  router: typeof router;
  testTraining: typeof testTraining;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
