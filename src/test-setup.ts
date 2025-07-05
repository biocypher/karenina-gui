import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-url'),
  writable: true,
  configurable: true,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

// Mock clipboard API - make it configurable so user-event can override it
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true, // This is key - allows user-event to redefine it
});

// Mock fetch
global.fetch = vi.fn();

// Mock window.alert and window.confirm
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
  configurable: true,
});

// Add DragEvent for drag and drop tests
global.DragEvent = class DragEvent extends Event {
  dataTransfer: DataTransfer;
  
  constructor(type: string, eventInitDict?: DragEventInit) {
    super(type, eventInitDict);
    this.dataTransfer = {
      dropEffect: 'none' as const,
      effectAllowed: 'uninitialized' as const,
      files: [] as any,
      items: [] as any,
      types: [],
      clearData: vi.fn(),
      getData: vi.fn(() => ''),
      setData: vi.fn(),
      setDragImage: vi.fn(),
    } as DataTransfer;
  }
} as any;

// Add DataTransfer for drag and drop tests
global.DataTransfer = class DataTransfer {
  dropEffect: 'none' | 'copy' | 'link' | 'move' = 'none';
  effectAllowed: string = 'uninitialized';
  files: FileList = [] as any;
  items: DataTransferItemList = [] as any;
  types: string[] = [];
  
  clearData = vi.fn();
  getData = vi.fn(() => '');
  setData = vi.fn();
  setDragImage = vi.fn();
} as any;

// Mock FileReader for file upload tests
global.FileReader = class FileReader extends EventTarget {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  readAsText(file: Blob): void {
    // Simulate async file reading
    setTimeout(() => {
      try {
        // For our tests, we'll extract content from the file name or use the file content
        if (file instanceof File) {
          // Try to parse the file content if it's JSON
          // Removed unused variables for linting
          
          // Use a real FileReader for actual content reading in tests
          const realReader = Object.create(FileReader.prototype);
          realReader.onload = (e: any) => {
            this.result = e.target.result;
            this.readyState = 2; // DONE
            if (this.onload) {
              this.onload.call(this, { target: this } as ProgressEvent<FileReader>);
            }
          };
          
          realReader.onerror = (e: any) => {
            this.error = e.target.error;
            this.readyState = 2; // DONE
            if (this.onerror) {
              this.onerror.call(this, { target: this } as any);
            }
          };
          
          // For test files, we can directly read the content
          if (file.size > 0) {
            file.text().then(text => {
              this.result = text;
              this.readyState = 2; // DONE
              if (this.onload) {
                this.onload.call(this, { target: this } as ProgressEvent<FileReader>);
              }
            }).catch(error => {
              this.error = error;
              this.readyState = 2; // DONE
              if (this.onerror) {
                this.onerror.call(this, { target: this } as any);
              }
            });
          } else {
            // Empty file
            this.result = '';
            this.readyState = 2; // DONE
            if (this.onload) {
              this.onload.call(this, { target: this } as ProgressEvent<FileReader>);
            }
          }
        }
      } catch (error) {
        this.error = error as DOMException;
        this.readyState = 2; // DONE
        if (this.onerror) {
          this.onerror.call(this, { target: this } as any);
        }
      }
    }, 10); // Small delay to simulate async behavior
  }

  readAsDataURL(_file: Blob): void {
    setTimeout(() => {
      this.result = 'data:application/octet-stream;base64,dGVzdA==';
      this.readyState = 2;
      if (this.onload) {
        this.onload.call(this, { target: this } as ProgressEvent<FileReader>);
      }
    }, 10);
  }

  readAsArrayBuffer(file: Blob): void {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      this.readyState = 2;
      if (this.onload) {
        this.onload.call(this, { target: this } as ProgressEvent<FileReader>);
      }
    }, 10);
  }

  abort(): void {
    this.readyState = 2;
    if (this.onabort) {
      this.onabort.call(this, { target: this } as any);
    }
  }

  static readonly EMPTY = 0;
  static readonly LOADING = 1;
  static readonly DONE = 2;
} as any;

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
  
  // Mock scrollIntoView for DOM elements
  Element.prototype.scrollIntoView = vi.fn();
});

// Clean up after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
}); 