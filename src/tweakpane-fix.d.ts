declare module 'tweakpane' {
    export class Pane {
      constructor(options?: any);
      addInput(...args: any[]): any;
      addButton(...args: any[]): any;
      addFolder(...args: any[]): any;
      element: HTMLElement;
    }
    export class FolderApi {
      addInput(...args: any[]): any;
      addButton(...args: any[]): any;
      addFolder(...args: any[]): any;
    }
  }