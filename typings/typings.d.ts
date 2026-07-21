/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path='local/file-saverjs/index.d.ts' />

// placeholders for webcola
declare module "d3-dispatch";
declare module "d3-timer";
declare module "d3-drag";

// asset imports handled by the bundler (Vite) — resolve to their URL
declare module "*.svg" {
  const url: string;
  export default url;
}
declare module "*.png" {
  const url: string;
  export default url;
}
declare module "*.jpg" {
  const url: string;
  export default url;
}
declare module "*.jpeg" {
  const url: string;
  export default url;
}
declare module "*.gif" {
  const url: string;
  export default url;
}
declare module "*.scss";
declare module "*.css";
