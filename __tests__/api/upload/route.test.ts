import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload/route';
import path from 'path';

// Mock fs/promises and fs modules
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

// Mock imports
const mockWriteFile = jest.mocked(require('fs/promises').writeFile);
const mockMkdir = jest.mocked(require('fs/promises').mkdir);
const mockExistsSync = jest.mocked(require('fs').existsSync);
const mockPathJoin = jest.mocked(path.join);

// Mock File and FormData
global.File = class MockFile {
  constructor(
    public chunks: BlobPart[],
    public filename: string,
    public options: FilePropertyBag = {}
  ) {}

  get name() {
    return this.filename;
  }

  get size() {
    return this.chunks.reduce((size, chunk) => {
      if (typeof chunk === 'string') return size + chunk.length;
      if (chunk instanceof ArrayBuffer) return size + chunk.byteLength;
      return size;
    }, 0);
  }

  get type() {
    return this.options.type || '';
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const totalSize = this.size;
    const buffer = new ArrayBuffer(totalSize);
    const view = new Uint8Array(buffer);
    let offset = 0;

    for (const chunk of this.chunks) {
      if (typeof chunk === 'string') {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(chunk);
        view.set(encoded, offset);
        offset += encoded.length;
      } else if (chunk instanceof ArrayBuffer) {
        view.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
    }

    return buffer;
  }
} as any;

describe('/api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    
    // Mock process.cwd()
    Object.defineProperty(process, 'cwd', {
      value: jest.fn(() => '/mock/project/path'),
    });
    
    // Mock Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/upload', () => {
    const createMockFormData = (file?: File | null) => {
      const formData = new FormData();
      if (file) {
        formData.set('file', file);
      }
      return formData;
    };

    const createMockFile = (
      name: string = 'test.jpg',
      content: string = 'mock file content',
      type: string = 'image/jpeg'
    ): File => {
      return new global.File([content], name, { type }) as File;
    };

    describe('Happy Path', () => {
      it('should upload file successfully when directory exists', async () => {
        const mockFile = createMockFile('test-image.jpg', 'image content');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads') // uploadsDir
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-test-image.jpg'); // filepath
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        // Mock request.formData()
        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          success: true,
          url: '/uploads/1234567890123-test-image.jpg',
        });
        expect(mockExistsSync).toHaveBeenCalledWith('/mock/project/path/public/uploads');
        expect(mockWriteFile).toHaveBeenCalledWith(
          '/mock/project/path/public/uploads/1234567890123-test-image.jpg',
          expect.any(Buffer)
        );
        expect(mockMkdir).not.toHaveBeenCalled();
      });

      it('should create uploads directory if it does not exist', async () => {
        const mockFile = createMockFile('test.jpg');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(false);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-test.jpg');
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          success: true,
          url: '/uploads/1234567890123-test.jpg',
        });
        expect(mockMkdir).toHaveBeenCalledWith('/mock/project/path/public/uploads', { recursive: true });
        expect(mockWriteFile).toHaveBeenCalled();
      });

      it('should handle files with spaces in name', async () => {
        const mockFile = createMockFile('my test file.jpg');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-my-test-file.jpg');
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.url).toBe('/uploads/1234567890123-my-test-file.jpg');
      });

      it('should handle files with special characters', async () => {
        const mockFile = createMockFile('file@#$%^&*()name.png');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-file@#$%^&*()name.png');
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.url).toBe('/uploads/1234567890123-file@#$%^&*()name.png');
      });

      it('should handle different file types', async () => {
        const fileTypes = [
          { name: 'document.pdf', type: 'application/pdf' },
          { name: 'image.png', type: 'image/png' },
          { name: 'video.mp4', type: 'video/mp4' },
          { name: 'audio.mp3', type: 'audio/mpeg' },
        ];

        for (const fileType of fileTypes) {
          const mockFile = createMockFile(fileType.name, 'content', fileType.type);
          const formData = createMockFormData(mockFile);
          
          mockExistsSync.mockReturnValue(true);
          mockPathJoin
            .mockReturnValueOnce('/mock/project/path/public/uploads')
            .mockReturnValueOnce(`/mock/project/path/public/uploads/1234567890123-${fileType.name}`);
          mockWriteFile.mockResolvedValue(undefined);

          const request = new NextRequest('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
          });

          request.formData = jest.fn().mockResolvedValue(formData);

          const response = await POST(request);
          const result = await response.json();

          expect(response.status).toBe(200);
          expect(result.url).toBe(`/uploads/1234567890123-${fileType.name}`);
        }
      });
    });

    describe('Input Verification', () => {
      it('should reject request without file', async () => {
        const formData = new FormData();

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'No file uploaded' });
        expect(mockWriteFile).not.toHaveBeenCalled();
      });

      it('should reject request with null file', async () => {
        const formData = new FormData();
        formData.set('file', null as any);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'No file uploaded' });
      });

      it('should reject request with empty file name', async () => {
        const mockFile = createMockFile('');
        const formData = createMockFormData(mockFile);

        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-');
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.url).toBe('/uploads/1234567890123-');
      });
    });

    describe('Branching', () => {
      it('should handle empty file content', async () => {
        const mockFile = createMockFile('empty.txt', '');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-empty.txt');
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.url).toBe('/uploads/1234567890123-empty.txt');
        expect(mockWriteFile).toHaveBeenCalledWith(
          '/mock/project/path/public/uploads/1234567890123-empty.txt',
          expect.any(Buffer)
        );
      });

      it('should handle large file names', async () => {
        const longFileName = 'a'.repeat(200) + '.txt';
        const mockFile = createMockFile(longFileName);
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce(`/mock/project/path/public/uploads/1234567890123-${longFileName}`);
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.url).toBe(`/uploads/1234567890123-${longFileName}`);
      });

      it('should handle consecutive spaces in filename', async () => {
        const mockFile = createMockFile('file    with    many    spaces.txt');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-file-with-many-spaces.txt');
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.url).toBe('/uploads/1234567890123-file-with-many-spaces.txt');
      });
    });

    describe('Exception Handling', () => {
      it('should handle formData parsing errors', async () => {
        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: 'invalid form data',
        });

        request.formData = jest.fn().mockRejectedValue(new Error('Invalid form data'));

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Failed to upload file' });
        expect(console.error).toHaveBeenCalledWith('Error uploading file:', expect.any(Error));
      });

      it('should handle file arrayBuffer conversion errors', async () => {
        const mockFile = createMockFile('test.jpg');
        mockFile.arrayBuffer = jest.fn().mockRejectedValue(new Error('ArrayBuffer error'));
        
        const formData = createMockFormData(mockFile);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Failed to upload file' });
        expect(console.error).toHaveBeenCalledWith('Error uploading file:', expect.any(Error));
      });

      it('should handle directory creation errors', async () => {
        const mockFile = createMockFile('test.jpg');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(false);
        mockPathJoin.mockReturnValueOnce('/mock/project/path/public/uploads');
        mockMkdir.mockRejectedValue(new Error('Permission denied'));

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Failed to upload file' });
        expect(console.error).toHaveBeenCalledWith('Error uploading file:', expect.any(Error));
      });

      it('should handle file write errors', async () => {
        const mockFile = createMockFile('test.jpg');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-test.jpg');
        mockWriteFile.mockRejectedValue(new Error('Disk full'));

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Failed to upload file' });
        expect(console.error).toHaveBeenCalledWith('Error uploading file:', expect.any(Error));
      });

      it('should handle existsSync errors', async () => {
        const mockFile = createMockFile('test.jpg');
        const formData = createMockFormData(mockFile);
        
        mockPathJoin.mockReturnValueOnce('/mock/project/path/public/uploads');
        mockExistsSync.mockImplementation(() => {
          throw new Error('File system error');
        });

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Failed to upload file' });
        expect(console.error).toHaveBeenCalledWith('Error uploading file:', expect.any(Error));
      });
    });

    describe('File Path Generation', () => {
      it('should generate unique filenames with timestamp', async () => {
        const mockFile = createMockFile('same-name.jpg');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-same-name.jpg');
        mockWriteFile.mockResolvedValue(undefined);

        const request1 = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request1.formData = jest.fn().mockResolvedValue(formData);

        const response1 = await POST(request1);
        const result1 = await response1.json();

        expect(response1.status).toBe(200);
        expect(result1.url).toBe('/uploads/1234567890123-same-name.jpg');

        // Test with different timestamp
        jest.spyOn(Date, 'now').mockReturnValue(1234567890124);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890124-same-name.jpg');

        const request2 = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request2.formData = jest.fn().mockResolvedValue(formData);

        const response2 = await POST(request2);
        const result2 = await response2.json();

        expect(response2.status).toBe(200);
        expect(result2.url).toBe('/uploads/1234567890124-same-name.jpg');
        expect(result1.url).not.toBe(result2.url);
      });

      it('should preserve file extension', async () => {
        const extensions = ['.jpg', '.png', '.pdf', '.txt', '.mp4', '.zip'];

        for (const ext of extensions) {
          const mockFile = createMockFile(`test${ext}`);
          const formData = createMockFormData(mockFile);
          
          mockExistsSync.mockReturnValue(true);
          mockPathJoin
            .mockReturnValueOnce('/mock/project/path/public/uploads')
            .mockReturnValueOnce(`/mock/project/path/public/uploads/1234567890123-test${ext}`);
          mockWriteFile.mockResolvedValue(undefined);

          const request = new NextRequest('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
          });

          request.formData = jest.fn().mockResolvedValue(formData);

          const response = await POST(request);
          const result = await response.json();

          expect(response.status).toBe(200);
          expect(result.url).toBe(`/uploads/1234567890123-test${ext}`);
        }
      });
    });

    describe('Buffer Handling', () => {
      it('should handle binary file content correctly', async () => {
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
        const mockFile = new global.File([binaryContent.buffer], 'image.png', { type: 'image/png' }) as File;
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-image.png');
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.url).toBe('/uploads/1234567890123-image.png');
        
        // Verify that writeFile was called with a Buffer containing the binary data
        expect(mockWriteFile).toHaveBeenCalledWith(
          '/mock/project/path/public/uploads/1234567890123-image.png',
          expect.any(Buffer)
        );
        
        const writtenBuffer = mockWriteFile.mock.calls[0][1] as Buffer;
        expect(writtenBuffer.length).toBe(binaryContent.length);
      });
    });

    describe('Response Format', () => {
      it('should return consistent response format', async () => {
        const mockFile = createMockFile('test.jpg');
        const formData = createMockFormData(mockFile);
        
        mockExistsSync.mockReturnValue(true);
        mockPathJoin
          .mockReturnValueOnce('/mock/project/path/public/uploads')
          .mockReturnValueOnce('/mock/project/path/public/uploads/1234567890123-test.jpg');
        mockWriteFile.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        request.formData = jest.fn().mockResolvedValue(formData);

        const response = await POST(request);
        const result = await response.json();

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('url');
        expect(result.url).toMatch(/^\/uploads\/\d+-.*$/);
        expect(Object.keys(result)).toHaveLength(2);
      });
    });
  });
});